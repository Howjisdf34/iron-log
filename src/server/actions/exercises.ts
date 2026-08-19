"use server";

import { db } from "@/db";
import type { Exercise } from "@/db/schema";
import { requireUserId } from "@/server/auth/session";
import { listEquipment, listMuscles, searchExercises } from "@/server/db/exercises";
import {
  exerciseSearchSchema,
  type ExerciseSearchInput,
} from "@/lib/validation/routines";

export async function searchExercisesAction(
  rawInput: ExerciseSearchInput,
): Promise<Exercise[]> {
  await requireUserId(); // catálogo compartido, pero sigue requiriendo sesión
  const input = exerciseSearchSchema.parse(rawInput);
  return searchExercises(db, input);
}

export async function listFiltersAction() {
  await requireUserId();
  const [muscles, equipment] = await Promise.all([listMuscles(db), listEquipment(db)]);
  return { muscles, equipment };
}
