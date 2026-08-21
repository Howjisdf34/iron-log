import { eq } from "drizzle-orm";
import type { Database } from "@/db";
import { userSettings, type UserSettings } from "@/db/schema";
import type { UpdateUserSettingsInput } from "@/lib/validation/settings";

export async function getOrCreateUserSettingsForUser(
  db: Database,
  userId: string,
): Promise<UserSettings> {
  const [existing] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(userSettings)
    .values({ userId })
    .onConflictDoNothing({ target: userSettings.userId })
    .returning();
  if (created) return created;

  const [row] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return row!;
}

export async function updateUserSettings(
  db: Database,
  userId: string,
  patch: UpdateUserSettingsInput,
): Promise<UserSettings> {
  await getOrCreateUserSettingsForUser(db, userId);
  const [updated] = await db
    .update(userSettings)
    .set(patch)
    .where(eq(userSettings.userId, userId))
    .returning();
  return updated!;
}
