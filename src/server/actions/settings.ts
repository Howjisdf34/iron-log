"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { requireUserId } from "@/server/auth/session";
import { updateUserSettings } from "@/server/db/user-settings";
import {
  updateUserSettingsSchema,
  type UpdateUserSettingsInput,
} from "@/lib/validation/settings";

export async function updateThemeAction(theme: UpdateUserSettingsInput["theme"]) {
  const userId = await requireUserId();
  const input = updateUserSettingsSchema.parse({ theme });
  await updateUserSettings(db, userId, input);
  revalidatePath("/", "layout");
}

export async function updateWorkoutModeAction(
  workoutMode: UpdateUserSettingsInput["workoutMode"],
) {
  const userId = await requireUserId();
  const input = updateUserSettingsSchema.parse({ workoutMode });
  await updateUserSettings(db, userId, input);
}
