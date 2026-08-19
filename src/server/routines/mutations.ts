import { eq } from "drizzle-orm";
import type { Database } from "@/db";
import {
  exercises,
  routineDays,
  routineExercises,
  routineSets,
  routines,
} from "@/db/schema";
import {
  assertDayOwnership,
  assertRoutineExerciseOwnership,
  getRoutineForUser,
  getRoutineWithDetails,
} from "@/server/db/routines";
import { getExercisesBySlugs } from "@/server/db/exercises";
import { getTemplate } from "./templates";
import type {
  CreateRoutineInput,
  RoutineSetInput,
  updateRoutineExerciseSchema,
} from "@/lib/validation/routines";
import type { z } from "zod";

/**
 * Lógica de negocio pura (recibe `userId` explícito) — separada de las
 * Server Actions en src/server/actions/routines.ts, que sólo agregan
 * `requireUserId()` (lee la sesión) antes de delegar acá. Permite testear
 * esto directo, sin mockear next-auth/`auth()`.
 */

export async function createRoutineFromTemplateForUser(
  db: Database,
  userId: string,
  templateId: string,
): Promise<string> {
  const template = getTemplate(templateId);
  if (!template) throw new Error("Plantilla no encontrada");

  const slugs = [
    ...new Set(template.days.flatMap((d) => d.exercises.map((e) => e.exerciseSlug))),
  ];
  const exerciseBySlug = await getExercisesBySlugs(db, slugs);

  return db.transaction(async (tx) => {
    const [routine] = await tx
      .insert(routines)
      .values({
        userId,
        name: template.name,
        description: template.description,
        goal: template.goal,
        splitType: template.splitType,
        daysPerWeek: template.daysPerWeek,
      })
      .returning({ id: routines.id });

    for (const [dayIndex, day] of template.days.entries()) {
      const [dayRow] = await tx
        .insert(routineDays)
        .values({ routineId: routine!.id, order: dayIndex, name: day.name })
        .returning({ id: routineDays.id });

      let exerciseOrder = 0;
      for (const templateExercise of day.exercises) {
        const exercise = exerciseBySlug.get(templateExercise.exerciseSlug);
        if (!exercise) {
          console.warn(
            `[createRoutineFromTemplate] slug no encontrado en catálogo: ${templateExercise.exerciseSlug} (plantilla ${templateId}) — se omite`,
          );
          continue;
        }

        const [reRow] = await tx
          .insert(routineExercises)
          .values({
            dayId: dayRow!.id,
            order: exerciseOrder,
            exerciseId: exercise.id,
            restSeconds: templateExercise.restSeconds,
            tempo: templateExercise.tempo,
          })
          .returning({ id: routineExercises.id });
        exerciseOrder += 1;

        await tx.insert(routineSets).values(
          templateExercise.sets.map((set, setIndex) => ({
            routineExerciseId: reRow!.id,
            setNumber: setIndex + 1,
            setType: set.setType,
            targetReps: set.targetReps ?? null,
            targetRepsMin: set.targetRepsMin ?? null,
            targetRepsMax: set.targetRepsMax ?? null,
            targetRpe: set.targetRpe ? String(set.targetRpe) : null,
          })),
        );
      }
    }

    return routine!.id;
  });
}

export async function createBlankRoutineForUser(
  db: Database,
  userId: string,
  input: CreateRoutineInput,
): Promise<string> {
  const [routine] = await db
    .insert(routines)
    .values({
      userId,
      name: input.name,
      description: input.description,
      goal: input.goal,
      splitType: input.splitType,
      daysPerWeek: input.daysPerWeek,
    })
    .returning({ id: routines.id });
  return routine!.id;
}

export async function archiveRoutineForUser(
  db: Database,
  userId: string,
  routineId: string,
): Promise<void> {
  const routine = await getRoutineForUser(db, userId, routineId);
  if (!routine) throw new Error("Rutina no encontrada");
  await db
    .update(routines)
    .set({ archivedAt: new Date() })
    .where(eq(routines.id, routineId));
}

export async function duplicateRoutineForUser(
  db: Database,
  userId: string,
  routineId: string,
): Promise<string> {
  const original = await getRoutineWithDetails(db, userId, routineId);
  if (!original) throw new Error("Rutina no encontrada");

  return db.transaction(async (tx) => {
    const [copy] = await tx
      .insert(routines)
      .values({
        userId,
        name: `${original.name} (copia)`,
        description: original.description,
        goal: original.goal,
        splitType: original.splitType,
        daysPerWeek: original.daysPerWeek,
        weeksTotal: original.weeksTotal,
        deloadEveryNWeeks: original.deloadEveryNWeeks,
      })
      .returning({ id: routines.id });

    for (const day of original.days) {
      const [dayRow] = await tx
        .insert(routineDays)
        .values({
          routineId: copy!.id,
          order: day.order,
          name: day.name,
          weekdayHint: day.weekdayHint,
          estimatedMinutes: day.estimatedMinutes,
          notes: day.notes,
        })
        .returning({ id: routineDays.id });

      for (const ex of day.exercises) {
        const [reRow] = await tx
          .insert(routineExercises)
          .values({
            dayId: dayRow!.id,
            order: ex.order,
            exerciseId: ex.exerciseId,
            supersetGroup: ex.supersetGroup,
            restSeconds: ex.restSeconds,
            tempo: ex.tempo,
            notes: ex.notes,
          })
          .returning({ id: routineExercises.id });

        if (ex.sets.length > 0) {
          await tx.insert(routineSets).values(
            ex.sets.map((s) => ({
              routineExerciseId: reRow!.id,
              setNumber: s.setNumber,
              setType: s.setType,
              targetReps: s.targetReps,
              targetRepsMin: s.targetRepsMin,
              targetRepsMax: s.targetRepsMax,
              targetWeightKg: s.targetWeightKg,
              targetRpe: s.targetRpe,
              targetPercent1rm: s.targetPercent1rm,
              restSecondsOverride: s.restSecondsOverride,
            })),
          );
        }
      }
    }

    return copy!.id;
  });
}

export async function addDayForUser(
  db: Database,
  userId: string,
  routineId: string,
): Promise<void> {
  const routine = await getRoutineForUser(db, userId, routineId);
  if (!routine) throw new Error("Rutina no encontrada");

  const existing = await db
    .select({ id: routineDays.id })
    .from(routineDays)
    .where(eq(routineDays.routineId, routineId));

  await db.insert(routineDays).values({
    routineId,
    order: existing.length,
    name: `Día ${existing.length + 1}`,
  });
}

export async function removeDayForUser(
  db: Database,
  userId: string,
  dayId: string,
): Promise<string> {
  const { routineId } = await assertDayOwnership(db, userId, dayId);
  await db.delete(routineDays).where(eq(routineDays.id, dayId));
  return routineId;
}

export async function reorderDaysForUser(
  db: Database,
  userId: string,
  routineId: string,
  orderedDayIds: string[],
): Promise<void> {
  const routine = await getRoutineForUser(db, userId, routineId);
  if (!routine) throw new Error("Rutina no encontrada");

  await db.transaction(async (tx) => {
    for (const [index, dayId] of orderedDayIds.entries()) {
      await tx.update(routineDays).set({ order: index }).where(eq(routineDays.id, dayId));
    }
  });
}

export async function addExerciseToDayForUser(
  db: Database,
  userId: string,
  dayId: string,
  exerciseId: string,
): Promise<string> {
  const { routineId } = await assertDayOwnership(db, userId, dayId);

  const existing = await db
    .select({ id: routineExercises.id })
    .from(routineExercises)
    .where(eq(routineExercises.dayId, dayId));

  const [exercise] = await db
    .select({ defaultRestSeconds: exercises.defaultRestSeconds })
    .from(exercises)
    .where(eq(exercises.id, exerciseId))
    .limit(1);

  const [reRow] = await db
    .insert(routineExercises)
    .values({
      dayId,
      order: existing.length,
      exerciseId,
      restSeconds: exercise?.defaultRestSeconds ?? 90,
    })
    .returning({ id: routineExercises.id });

  // Serie de trabajo por defecto — el caso feliz es sólo ajustar reps/peso.
  await db.insert(routineSets).values({
    routineExerciseId: reRow!.id,
    setNumber: 1,
    setType: "working",
    targetReps: 10,
  });

  return routineId;
}

export async function removeExerciseFromDayForUser(
  db: Database,
  userId: string,
  routineExerciseId: string,
): Promise<string> {
  const { routineId } = await assertRoutineExerciseOwnership(
    db,
    userId,
    routineExerciseId,
  );
  await db.delete(routineExercises).where(eq(routineExercises.id, routineExerciseId));
  return routineId;
}

export async function reorderExercisesForUser(
  db: Database,
  userId: string,
  dayId: string,
  orderedExerciseIds: string[],
): Promise<string> {
  const { routineId } = await assertDayOwnership(db, userId, dayId);

  await db.transaction(async (tx) => {
    for (const [index, id] of orderedExerciseIds.entries()) {
      await tx
        .update(routineExercises)
        .set({ order: index })
        .where(eq(routineExercises.id, id));
    }
  });
  return routineId;
}

export async function updateRoutineExerciseForUser(
  db: Database,
  userId: string,
  input: z.infer<typeof updateRoutineExerciseSchema>,
): Promise<string> {
  const { routineId } = await assertRoutineExerciseOwnership(
    db,
    userId,
    input.routineExerciseId,
  );

  await db
    .update(routineExercises)
    .set({
      restSeconds: input.restSeconds,
      tempo: input.tempo,
      notes: input.notes,
      supersetGroup: input.supersetGroup,
    })
    .where(eq(routineExercises.id, input.routineExerciseId));

  return routineId;
}

export async function updateExerciseSetsForUser(
  db: Database,
  userId: string,
  routineExerciseId: string,
  sets: RoutineSetInput[],
): Promise<string> {
  const { routineId } = await assertRoutineExerciseOwnership(
    db,
    userId,
    routineExerciseId,
  );

  await db.transaction(async (tx) => {
    await tx
      .delete(routineSets)
      .where(eq(routineSets.routineExerciseId, routineExerciseId));
    if (sets.length > 0) {
      await tx.insert(routineSets).values(
        sets.map((s, index) => ({
          routineExerciseId,
          setNumber: index + 1,
          setType: s.setType,
          targetReps: s.targetReps ?? null,
          targetRepsMin: s.targetRepsMin ?? null,
          targetRepsMax: s.targetRepsMax ?? null,
          targetWeightKg: s.targetWeightKg != null ? String(s.targetWeightKg) : null,
          targetRpe: s.targetRpe != null ? String(s.targetRpe) : null,
          restSecondsOverride: s.restSecondsOverride ?? null,
        })),
      );
    }
  });

  return routineId;
}
