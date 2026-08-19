import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getRoutineWithDetails } from "@/server/db/routines";
import { getExercisesBySlugs } from "@/server/db/exercises";
import { ROUTINE_TEMPLATES } from "./templates";
import {
  addExerciseToDayForUser,
  createRoutineFromTemplateForUser,
  duplicateRoutineForUser,
  removeExerciseFromDayForUser,
  updateExerciseSetsForUser,
} from "./mutations";

describe("routines/mutations (integración real, DB de verdad)", () => {
  const userAEmail = `mut-a-${Date.now()}@ironlog.test`;
  const userBEmail = `mut-b-${Date.now()}@ironlog.test`;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    const [a] = await db
      .insert(users)
      .values({ email: userAEmail, name: "Mut A", passwordHash: "x" })
      .returning({ id: users.id });
    const [b] = await db
      .insert(users)
      .values({ email: userBEmail, name: "Mut B", passwordHash: "x" })
      .returning({ id: users.id });
    userAId = a!.id;
    userBId = b!.id;
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userAId));
    await db.delete(users).where(eq(users.id, userBId));
  });

  it("cada plantilla resuelve el 100% de sus slugs contra el catálogo real", async () => {
    for (const template of ROUTINE_TEMPLATES) {
      const slugs = [
        ...new Set(template.days.flatMap((d) => d.exercises.map((e) => e.exerciseSlug))),
      ];
      const found = await getExercisesBySlugs(db, slugs);
      expect(found.size, `plantilla ${template.id}`).toBe(slugs.length);
    }
  });

  it("createRoutineFromTemplateForUser crea días/ejercicios/series completos", async () => {
    const routineId = await createRoutineFromTemplateForUser(db, userAId, "full-body-3");
    const full = await getRoutineWithDetails(db, userAId, routineId);

    expect(full?.days).toHaveLength(3);
    expect(full?.days[0]?.exercises.length).toBeGreaterThan(0);
    expect(full?.days[0]?.exercises[0]?.sets.length).toBeGreaterThan(0);
  });

  it("un usuario no puede mutar ejercicios de una rutina ajena", async () => {
    const routineId = await createRoutineFromTemplateForUser(db, userAId, "strength-5x5");
    const full = await getRoutineWithDetails(db, userAId, routineId);
    const routineExerciseId = full!.days[0]!.exercises[0]!.id;

    await expect(
      updateExerciseSetsForUser(db, userBId, routineExerciseId, [
        { setType: "working", targetReps: 99 },
      ]),
    ).rejects.toThrow();

    await expect(
      removeExerciseFromDayForUser(db, userBId, routineExerciseId),
    ).rejects.toThrow();
  });

  it("addExerciseToDayForUser agrega un ejercicio con una serie por defecto", async () => {
    const routineId = await createRoutineFromTemplateForUser(db, userAId, "full-body-3");
    const before = await getRoutineWithDetails(db, userAId, routineId);
    const dayId = before!.days[0]!.id;
    const beforeCount = before!.days[0]!.exercises.length;

    const [anyExercise] = await getExercisesBySlugs(db, ["bench-press"]).then((m) => [
      m.get("bench-press"),
    ]);
    await addExerciseToDayForUser(db, userAId, dayId, anyExercise!.id);

    const after = await getRoutineWithDetails(db, userAId, routineId);
    expect(after!.days[0]!.exercises.length).toBe(beforeCount + 1);
    const added = after!.days[0]!.exercises.at(-1)!;
    expect(added.sets).toHaveLength(1);
  });

  it("duplicateRoutineForUser copia días/ejercicios/series con nombre sufijado", async () => {
    const originalId = await createRoutineFromTemplateForUser(
      db,
      userAId,
      "strength-5x5",
    );
    const original = await getRoutineWithDetails(db, userAId, originalId);

    const copyId = await duplicateRoutineForUser(db, userAId, originalId);
    const copy = await getRoutineWithDetails(db, userAId, copyId);

    expect(copy?.name).toBe(`${original?.name} (copia)`);
    expect(copy?.days.length).toBe(original?.days.length);
    const originalSets = original!.days.reduce(
      (s, d) => s + d.exercises.reduce((s2, e) => s2 + e.sets.length, 0),
      0,
    );
    const copySets = copy!.days.reduce(
      (s, d) => s + d.exercises.reduce((s2, e) => s2 + e.sets.length, 0),
      0,
    );
    expect(copySets).toBe(originalSets);
  });
});
