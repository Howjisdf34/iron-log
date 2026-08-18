import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { routines, users } from "@/db/schema";
import { getRoutineForUser, listRoutinesForUser } from "./routines";

/**
 * Prueba que las queries escopeadas por userId aíslan de verdad a los 2
 * usuarios (CLAUDE.md §5.1: "el usuario A no puede leer datos de B").
 * Requiere DATABASE_URL con las migraciones aplicadas — ver
 * vitest.integration.config.mts.
 */
describe("aislamiento por userId", () => {
  const userA = { email: `test-a-${Date.now()}@ironlog.test`, name: "Test A" };
  const userB = { email: `test-b-${Date.now()}@ironlog.test`, name: "Test B" };
  let userAId: string;
  let userBId: string;
  let routineAId: string;
  let routineBId: string;

  beforeAll(async () => {
    const [a] = await db
      .insert(users)
      .values({ ...userA, passwordHash: "test-hash" })
      .returning({ id: users.id });
    const [b] = await db
      .insert(users)
      .values({ ...userB, passwordHash: "test-hash" })
      .returning({ id: users.id });
    userAId = a!.id;
    userBId = b!.id;

    const [routineA] = await db
      .insert(routines)
      .values({
        userId: userAId,
        name: "Push A (de A)",
        goal: "hypertrophy",
        splitType: "ppl",
        daysPerWeek: 6,
      })
      .returning({ id: routines.id });
    const [routineB] = await db
      .insert(routines)
      .values({
        userId: userBId,
        name: "Push A (de B)",
        goal: "strength",
        splitType: "upper_lower",
        daysPerWeek: 4,
      })
      .returning({ id: routines.id });
    routineAId = routineA!.id;
    routineBId = routineB!.id;
  });

  afterAll(async () => {
    // cascade delete se lleva las rutinas al borrar los usuarios de prueba.
    await db.delete(users).where(eq(users.id, userAId));
    await db.delete(users).where(eq(users.id, userBId));
  });

  it("listRoutinesForUser sólo devuelve las rutinas del usuario dueño", async () => {
    const asA = await listRoutinesForUser(db, userAId);
    const asB = await listRoutinesForUser(db, userBId);

    expect(asA.map((r) => r.id)).toEqual([routineAId]);
    expect(asB.map((r) => r.id)).toEqual([routineBId]);
  });

  it("getRoutineForUser no deja a A leer una rutina de B aunque adivine el id", async () => {
    const leaked = await getRoutineForUser(db, userAId, routineBId);
    expect(leaked).toBeUndefined();

    const own = await getRoutineForUser(db, userAId, routineAId);
    expect(own?.id).toBe(routineAId);
  });
});
