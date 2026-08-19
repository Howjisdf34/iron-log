import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { exercises, setLogs, users } from "@/db/schema";
import { newId } from "@/lib/id";
import {
  abandonSessionForUser,
  finishSessionForUser,
  logSetForUser,
  startSessionForUser,
} from "./mutations";
import { getPlayerData } from "./player-data";

describe("workout/mutations (integración real, DB de verdad)", () => {
  const userAEmail = `wo-a-${Date.now()}@ironlog.test`;
  const userBEmail = `wo-b-${Date.now()}@ironlog.test`;
  let userAId: string;
  let userBId: string;
  let benchPressId: string;

  beforeAll(async () => {
    const [a] = await db
      .insert(users)
      .values({ email: userAEmail, name: "Workout A", passwordHash: "x" })
      .returning({ id: users.id });
    const [b] = await db
      .insert(users)
      .values({ email: userBEmail, name: "Workout B", passwordHash: "x" })
      .returning({ id: users.id });
    userAId = a!.id;
    userBId = b!.id;

    const [exercise] = await db
      .select({ id: exercises.id })
      .from(exercises)
      .where(eq(exercises.slug, "bench-press"))
      .limit(1);
    benchPressId = exercise!.id;
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userAId));
    await db.delete(users).where(eq(users.id, userBId));
  });

  it("startSessionForUser reutiliza la sesión in_progress existente", async () => {
    const first = await startSessionForUser(db, userAId, null);
    const second = await startSessionForUser(db, userAId, null);
    expect(second).toBe(first);
    await abandonSessionForUser(db, userAId, first);
  });

  it("logSetForUser detecta un PR de 1RM estimado y de peso en la primera serie", async () => {
    const sessionId = await startSessionForUser(db, userAId, null);

    const { setLog, prTypes } = await logSetForUser(db, userAId, {
      clientId: newId(),
      sessionId,
      exerciseId: benchPressId,
      order: 0,
      setType: "working",
      weightKg: 80,
      reps: 5,
      rpe: 8,
      failed: false,
    });

    expect(setLog.isPr).toBe(true);
    expect(prTypes).toEqual(expect.arrayContaining(["1rm_estimated", "weight"]));

    await abandonSessionForUser(db, userAId, sessionId);
  });

  it("no marca PR si el peso es igual o menor al histórico", async () => {
    const first = await startSessionForUser(db, userAId, null);
    await logSetForUser(db, userAId, {
      clientId: newId(),
      sessionId: first,
      exerciseId: benchPressId,
      order: 0,
      setType: "working",
      weightKg: 100,
      reps: 5,
      failed: false,
    });
    await abandonSessionForUser(db, userAId, first);

    const second = await startSessionForUser(db, userAId, null);
    const { prTypes } = await logSetForUser(db, userAId, {
      clientId: newId(),
      sessionId: second,
      exerciseId: benchPressId,
      order: 0,
      setType: "working",
      weightKg: 90,
      reps: 5,
      failed: false,
    });
    expect(prTypes).toEqual([]);
    await abandonSessionForUser(db, userAId, second);
  });

  it("un usuario no puede registrar series en la sesión de otro usuario", async () => {
    const sessionId = await startSessionForUser(db, userAId, null);
    await expect(
      logSetForUser(db, userBId, {
        clientId: newId(),
        sessionId,
        exerciseId: benchPressId,
        order: 0,
        setType: "working",
        weightKg: 50,
        reps: 5,
        failed: false,
      }),
    ).rejects.toThrow();
    await abandonSessionForUser(db, userAId, sessionId);
  });

  it("finishSessionForUser agrega volumen/series y marca la sesión completed", async () => {
    const sessionId = await startSessionForUser(db, userAId, null);
    await logSetForUser(db, userAId, {
      clientId: newId(),
      sessionId,
      exerciseId: benchPressId,
      order: 0,
      setType: "working",
      weightKg: 60,
      reps: 10,
      failed: false,
    });
    await logSetForUser(db, userAId, {
      clientId: newId(),
      sessionId,
      exerciseId: benchPressId,
      order: 1,
      setType: "working",
      weightKg: 60,
      reps: 8,
      failed: false,
    });
    await logSetForUser(db, userAId, {
      clientId: newId(),
      sessionId,
      exerciseId: benchPressId,
      order: 2,
      setType: "working",
      weightKg: 60,
      reps: 0,
      failed: true,
    });

    const summary = await finishSessionForUser(db, userAId, { sessionId });
    expect(summary.totalSets).toBe(2);
    expect(summary.totalVolumeKg).toBe(60 * 10 + 60 * 8);
  });

  it("getPlayerData en modo libre reconstruye la cola desde los set_logs ya registrados", async () => {
    const sessionId = await startSessionForUser(db, userAId, null);
    await logSetForUser(db, userAId, {
      clientId: newId(),
      sessionId,
      exerciseId: benchPressId,
      order: 0,
      setType: "working",
      weightKg: 40,
      reps: 12,
      failed: false,
    });

    const data = await getPlayerData(db, userAId, sessionId);
    expect(data?.routineDayId).toBeNull();
    expect(data?.exercises).toHaveLength(1);
    expect(data?.exercises[0]?.loggedSets).toHaveLength(1);

    await abandonSessionForUser(db, userAId, sessionId);
  });

  it("logSetForUser es idempotente por clientId — reenviar el mismo batch 3 veces no duplica (outbox offline, CLAUDE.md §5.5)", async () => {
    const sessionId = await startSessionForUser(db, userAId, null);
    const input = {
      clientId: newId(),
      sessionId,
      exerciseId: benchPressId,
      order: 0,
      setType: "working" as const,
      weightKg: 55,
      reps: 6,
      failed: false,
    };

    const first = await logSetForUser(db, userAId, input);
    const second = await logSetForUser(db, userAId, input);
    const third = await logSetForUser(db, userAId, input);

    expect(first.setLog.id).toBe(second.setLog.id);
    expect(first.setLog.id).toBe(third.setLog.id);
    // Sólo la primera inserción corre la detección de PR — los reintentos no la repiten.
    expect(second.prTypes).toEqual([]);
    expect(third.prTypes).toEqual([]);

    const rows = await db
      .select()
      .from(setLogs)
      .where(eq(setLogs.clientId, input.clientId));
    expect(rows).toHaveLength(1);

    await abandonSessionForUser(db, userAId, sessionId);
  });
});
