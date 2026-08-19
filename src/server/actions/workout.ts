"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { requireUserId } from "@/server/auth/session";
import * as mutations from "@/server/workout/mutations";
import {
  getExercisePlayerInfo,
  getPlayerData,
  toPlayerLoggedSet,
  type PlayerData,
  type PlayerExerciseSlot,
} from "@/server/workout/player-data";
import {
  getOrCreatePlateInventoryForUser,
  updatePlateInventoryForUser,
} from "@/server/db/plate-inventory";
import { getOrCreateUserSettingsForUser } from "@/server/db/user-settings";
import {
  finishSessionSchema,
  logSetSchema,
  updatePlateInventorySchema,
  updateSetLogSchema,
  type FinishSessionInput,
  type LogSetInput,
  type UpdatePlateInventoryInput,
  type UpdateSetLogInput,
} from "@/lib/validation/workout";
import type { FinishSessionSummary } from "@/server/workout/mutations";
import type { PlateInventory, UserSettings } from "@/db/schema";

export async function startWorkoutAction(routineDayId: string | null): Promise<never> {
  const userId = await requireUserId();
  const sessionId = await mutations.startSessionForUser(db, userId, routineDayId);
  redirect(`/entrenar/${sessionId}`);
}

export async function getPlayerDataAction(
  sessionId: string,
): Promise<PlayerData | undefined> {
  const userId = await requireUserId();
  return getPlayerData(db, userId, sessionId);
}

export async function getExercisePlayerInfoAction(
  sessionId: string,
  exerciseId: string,
): Promise<Omit<PlayerExerciseSlot, "order"> | undefined> {
  const userId = await requireUserId();
  return getExercisePlayerInfo(db, userId, sessionId, exerciseId);
}

export async function logSetAction(rawInput: LogSetInput) {
  const userId = await requireUserId();
  const input = logSetSchema.parse(rawInput);
  const { setLog, prTypes } = await mutations.logSetForUser(db, userId, input);
  revalidatePath(`/entrenar/${input.sessionId}`);
  return { setLog: toPlayerLoggedSet(setLog), prTypes };
}

export async function updateSetLogAction(rawInput: UpdateSetLogInput) {
  const userId = await requireUserId();
  const input = updateSetLogSchema.parse(rawInput);
  const sessionId = await mutations.updateSetLogForUser(db, userId, input);
  revalidatePath(`/entrenar/${sessionId}`);
}

export async function deleteSetLogAction(setLogId: string): Promise<void> {
  const userId = await requireUserId();
  const sessionId = await mutations.deleteSetLogForUser(db, userId, setLogId);
  revalidatePath(`/entrenar/${sessionId}`);
}

export async function abandonSessionAction(sessionId: string): Promise<void> {
  const userId = await requireUserId();
  await mutations.abandonSessionForUser(db, userId, sessionId);
  revalidatePath("/");
}

export async function finishSessionAction(
  rawInput: FinishSessionInput,
): Promise<FinishSessionSummary> {
  const userId = await requireUserId();
  const input = finishSessionSchema.parse(rawInput);
  const summary = await mutations.finishSessionForUser(db, userId, input);
  revalidatePath("/");
  revalidatePath("/historial");
  return summary;
}

export async function getPlateInventoryAction(): Promise<PlateInventory> {
  const userId = await requireUserId();
  return getOrCreatePlateInventoryForUser(db, userId);
}

export async function updatePlateInventoryAction(
  rawInput: UpdatePlateInventoryInput,
): Promise<PlateInventory> {
  const userId = await requireUserId();
  const input = updatePlateInventorySchema.parse(rawInput);
  return updatePlateInventoryForUser(db, userId, input);
}

export async function getUserSettingsAction(): Promise<UserSettings> {
  const userId = await requireUserId();
  return getOrCreateUserSettingsForUser(db, userId);
}
