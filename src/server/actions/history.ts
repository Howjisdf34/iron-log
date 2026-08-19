"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { requireUserId } from "@/server/auth/session";
import {
  listCompletedSessionsForUser,
  getSessionDetailForUser,
} from "@/server/db/history";
import { getExerciseHistoryForUser } from "@/server/db/exercise-progress";
import { getMuscleSetPointsForUser } from "@/server/db/muscle-volume";
import { listPersonalRecordsForUser } from "@/server/db/personal-records";
import {
  listBodyMetricsForUser,
  upsertBodyMetricForUser,
  deleteBodyMetricForUser,
} from "@/server/db/body-metrics";
import { listMuscles } from "@/server/db/exercises";
import {
  getTrainingOverviewForUser,
  type TrainingOverview,
} from "@/server/history/overview";
import { updateSessionMetaForUser } from "@/server/workout/mutations";
import {
  estimatedOneRepMaxOverTime,
  maxWeightOverTime,
  weeklyVolume,
  type OneRepMaxPoint,
  type WeeklyVolumePoint,
} from "@/lib/exercise-progress";
import { weeklyMuscleVolume, type WeeklyMuscleVolume } from "@/lib/muscle-volume";
import {
  bodyMetricSchema,
  updateSessionMetaSchema,
  type BodyMetricInput,
  type UpdateSessionMetaInput,
} from "@/lib/validation/history";
import type { BodyMetric } from "@/db/schema";

export async function listCompletedSessionsAction(
  limit?: number,
): Promise<Awaited<ReturnType<typeof listCompletedSessionsForUser>>> {
  const userId = await requireUserId();
  return listCompletedSessionsForUser(db, userId, limit);
}

export async function getSessionDetailAction(sessionId: string) {
  const userId = await requireUserId();
  return getSessionDetailForUser(db, userId, sessionId);
}

export async function updateSessionMetaAction(
  rawInput: UpdateSessionMetaInput,
): Promise<void> {
  const userId = await requireUserId();
  const input = updateSessionMetaSchema.parse(rawInput);
  await updateSessionMetaForUser(db, userId, input);
  revalidatePath(`/historial/${input.sessionId}`);
}

export async function getTrainingOverviewAction(): Promise<TrainingOverview> {
  const userId = await requireUserId();
  return getTrainingOverviewForUser(db, userId);
}

export async function listPersonalRecordsAction(): Promise<
  Awaited<ReturnType<typeof listPersonalRecordsForUser>>
> {
  const userId = await requireUserId();
  return listPersonalRecordsForUser(db, userId);
}

export interface ExerciseProgress {
  oneRepMax: OneRepMaxPoint[];
  maxWeight: { date: string; weightKg: number }[];
  volume: WeeklyVolumePoint[];
}

export async function getExerciseProgressAction(
  exerciseId: string,
): Promise<ExerciseProgress> {
  const userId = await requireUserId();
  const points = await getExerciseHistoryForUser(db, userId, exerciseId);
  return {
    oneRepMax: estimatedOneRepMaxOverTime(points),
    maxWeight: maxWeightOverTime(points),
    volume: weeklyVolume(points),
  };
}

export interface MuscleVolumeReport {
  volume: WeeklyMuscleVolume[];
  muscles: { id: string; slug: string; nameEs: string }[];
}

export async function getMuscleVolumeAction(weeksBack = 8): Promise<MuscleVolumeReport> {
  const userId = await requireUserId();
  const since = new Date(Date.now() - weeksBack * 7 * 86_400_000);
  const [points, muscles] = await Promise.all([
    getMuscleSetPointsForUser(db, userId, since),
    listMuscles(db),
  ]);
  return {
    volume: weeklyMuscleVolume(points),
    muscles: muscles.map((m) => ({ id: m.id, slug: m.slug, nameEs: m.nameEs })),
  };
}

export async function listBodyMetricsAction(): Promise<BodyMetric[]> {
  const userId = await requireUserId();
  return listBodyMetricsForUser(db, userId);
}

export async function upsertBodyMetricAction(
  rawInput: BodyMetricInput,
): Promise<BodyMetric> {
  const userId = await requireUserId();
  const input = bodyMetricSchema.parse(rawInput);
  const result = await upsertBodyMetricForUser(db, userId, input);
  revalidatePath("/cuerpo");
  return result;
}

export async function deleteBodyMetricAction(metricId: string): Promise<void> {
  const userId = await requireUserId();
  await deleteBodyMetricForUser(db, userId, metricId);
  revalidatePath("/cuerpo");
}
