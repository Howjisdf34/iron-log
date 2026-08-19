"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { requireUserId } from "@/server/auth/session";
import * as mutations from "@/server/routines/mutations";
import {
  createRoutineSchema,
  routineSetInputSchema,
  updateRoutineExerciseSchema,
  type CreateRoutineInput,
  type RoutineSetInput,
} from "@/lib/validation/routines";

function revalidateRoutine(routineId: string) {
  revalidatePath("/rutinas");
  revalidatePath(`/rutinas/${routineId}`);
}

export async function createRoutineFromTemplate(
  templateId: string,
): Promise<{ id: string }> {
  const userId = await requireUserId();
  const id = await mutations.createRoutineFromTemplateForUser(db, userId, templateId);
  revalidateRoutine(id);
  return { id };
}

export async function createBlankRoutine(
  rawInput: CreateRoutineInput,
): Promise<{ id: string }> {
  const userId = await requireUserId();
  const input = createRoutineSchema.parse(rawInput);
  const id = await mutations.createBlankRoutineForUser(db, userId, input);
  revalidateRoutine(id);
  return { id };
}

export async function archiveRoutine(routineId: string): Promise<void> {
  const userId = await requireUserId();
  await mutations.archiveRoutineForUser(db, userId, routineId);
  revalidateRoutine(routineId);
}

export async function duplicateRoutine(routineId: string): Promise<{ id: string }> {
  const userId = await requireUserId();
  const id = await mutations.duplicateRoutineForUser(db, userId, routineId);
  revalidateRoutine(id);
  return { id };
}

export async function addDay(routineId: string): Promise<void> {
  const userId = await requireUserId();
  await mutations.addDayForUser(db, userId, routineId);
  revalidateRoutine(routineId);
}

export async function removeDay(dayId: string): Promise<void> {
  const userId = await requireUserId();
  const routineId = await mutations.removeDayForUser(db, userId, dayId);
  revalidateRoutine(routineId);
}

export async function reorderDays(
  routineId: string,
  orderedDayIds: string[],
): Promise<void> {
  const userId = await requireUserId();
  await mutations.reorderDaysForUser(db, userId, routineId, orderedDayIds);
  revalidateRoutine(routineId);
}

export async function addExerciseToDay(dayId: string, exerciseId: string): Promise<void> {
  const userId = await requireUserId();
  const routineId = await mutations.addExerciseToDayForUser(
    db,
    userId,
    dayId,
    exerciseId,
  );
  revalidateRoutine(routineId);
}

export async function removeExerciseFromDay(routineExerciseId: string): Promise<void> {
  const userId = await requireUserId();
  const routineId = await mutations.removeExerciseFromDayForUser(
    db,
    userId,
    routineExerciseId,
  );
  revalidateRoutine(routineId);
}

export async function reorderExercises(
  dayId: string,
  orderedExerciseIds: string[],
): Promise<void> {
  const userId = await requireUserId();
  const routineId = await mutations.reorderExercisesForUser(
    db,
    userId,
    dayId,
    orderedExerciseIds,
  );
  revalidateRoutine(routineId);
}

export async function updateRoutineExercise(rawInput: unknown): Promise<void> {
  const userId = await requireUserId();
  const input = updateRoutineExerciseSchema.parse(rawInput);
  const routineId = await mutations.updateRoutineExerciseForUser(db, userId, input);
  revalidateRoutine(routineId);
}

export async function updateExerciseSets(
  routineExerciseId: string,
  rawSets: RoutineSetInput[],
): Promise<void> {
  const userId = await requireUserId();
  const sets = rawSets.map((s) => routineSetInputSchema.parse(s));
  const routineId = await mutations.updateExerciseSetsForUser(
    db,
    userId,
    routineExerciseId,
    sets,
  );
  revalidateRoutine(routineId);
}
