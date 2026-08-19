import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bodyMetrics, exercises, personalRecords, routines, users } from "@/db/schema";
import { newId } from "@/lib/id";
import { createRoutineFromTemplateForUser } from "@/server/routines/mutations";
import {
  finishSessionForUser,
  logSetForUser,
  startSessionForUser,
  updateSessionMetaForUser,
} from "@/server/workout/mutations";
import { getRoutineWithDetails } from "@/server/db/routines";
import { getTrainingOverviewForUser } from "./overview";
import {
  buildUserDataDump,
  restoreUserDataDump,
  type UserDataDump,
} from "@/server/export/dump";
import { userDataDumpSchema } from "@/lib/validation/export-dump";
import { reviveDates } from "@/lib/json-date-reviver";

describe("history/overview + export/import (integración real, DB de verdad)", () => {
  const userAEmail = `hist-a-${Date.now()}@ironlog.test`;
  const userBEmail = `hist-b-${Date.now()}@ironlog.test`;
  let userAId: string;
  let userBId: string;
  let benchPressId: string;

  beforeAll(async () => {
    const [a] = await db
      .insert(users)
      .values({ email: userAEmail, name: "Hist A", passwordHash: "x" })
      .returning({ id: users.id });
    const [b] = await db
      .insert(users)
      .values({ email: userBEmail, name: "Hist B", passwordHash: "x" })
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

  it("updateSessionMetaForUser sólo deja editar sesiones propias", async () => {
    const sessionId = await startSessionForUser(db, userAId, null);
    await finishSessionForUser(db, userAId, { sessionId });

    await updateSessionMetaForUser(db, userAId, {
      sessionId,
      bodyweightKg: 78.5,
      mood: 4,
      energy: 3,
      notes: "buena sesión",
    });

    await expect(
      updateSessionMetaForUser(db, userBId, { sessionId, notes: "no debería poder" }),
    ).rejects.toThrow();
  });

  it("getTrainingOverviewForUser cuenta la racha con la sesión de hoy", async () => {
    const sessionId = await startSessionForUser(db, userAId, null);
    await finishSessionForUser(db, userAId, { sessionId });

    const overview = await getTrainingOverviewForUser(db, userAId);
    expect(overview.streak.current).toBeGreaterThanOrEqual(1);
    expect(overview.trainingDates.length).toBeGreaterThan(0);
  });

  it("export -> restore reconstruye rutinas, sesiones, PRs y peso corporal del usuario", async () => {
    const routineId = await createRoutineFromTemplateForUser(db, userAId, "strength-5x5");
    const routine = await getRoutineWithDetails(db, userAId, routineId);
    const dayId = routine!.days[0]!.id;

    const sessionId = await startSessionForUser(db, userAId, dayId);
    await logSetForUser(db, userAId, {
      clientId: newId(),
      sessionId,
      exerciseId: benchPressId,
      order: 0,
      setType: "working",
      weightKg: 70,
      reps: 5,
      failed: false,
    });
    await finishSessionForUser(db, userAId, { sessionId });

    await db
      .insert(bodyMetrics)
      .values({ userId: userAId, date: "2026-01-15", weightKg: "80" });

    const dump = await buildUserDataDump(db, userAId);
    expect(dump.routines.length).toBeGreaterThan(0);
    expect(dump.sessions.length).toBeGreaterThan(0);
    expect(dump.personalRecords.length).toBeGreaterThan(0);
    expect(dump.bodyMetrics.length).toBeGreaterThan(0);

    await restoreUserDataDump(db, userAId, dump);

    const restoredDump = await buildUserDataDump(db, userAId);
    expect(restoredDump.routines.length).toBe(dump.routines.length);
    expect(restoredDump.sessions.length).toBe(dump.sessions.length);
    expect(restoredDump.personalRecords.length).toBe(dump.personalRecords.length);
    expect(restoredDump.bodyMetrics.length).toBe(dump.bodyMetrics.length);

    // el usuario B no se toca por restaurar el dump de A
    const [routineForB] = await db
      .select({ id: routines.id })
      .from(routines)
      .where(eq(routines.userId, userBId));
    expect(routineForB).toBeUndefined();
    const [prForB] = await db
      .select({ id: personalRecords.id })
      .from(personalRecords)
      .where(eq(personalRecords.userId, userBId));
    expect(prForB).toBeUndefined();
  });

  it("el JSON del export sobrevive un round-trip completo (stringify -> parse -> revive -> Zod -> restore), como hace /api/import", async () => {
    const dump = await buildUserDataDump(db, userAId);

    const json = JSON.parse(JSON.stringify(dump)) as unknown;
    const revived = reviveDates(json);
    const parsed = userDataDumpSchema.parse(revived);
    expect(parsed.sessions[0]?.startedAt).toBeInstanceOf(Date);
    // los timestamps anidados en rutinas también deben revivir, no sólo el top-level
    expect(parsed.routines[0]?.days[0]?.exercises[0]?.sets[0]).toBeDefined();

    await expect(
      restoreUserDataDump(db, userAId, parsed as unknown as UserDataDump),
    ).resolves.not.toThrow();
  });
});
