import { desc, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { exercises, personalRecords } from "@/db/schema";

export async function listPersonalRecordsForUser(db: Database, userId: string) {
  const rows = await db
    .select({
      id: personalRecords.id,
      type: personalRecords.type,
      value: personalRecords.value,
      achievedAt: personalRecords.achievedAt,
      setLogId: personalRecords.setLogId,
      exerciseId: personalRecords.exerciseId,
      exerciseName: exercises.nameEs,
      exerciseSlug: exercises.slug,
    })
    .from(personalRecords)
    .innerJoin(exercises, eq(exercises.id, personalRecords.exerciseId))
    .where(eq(personalRecords.userId, userId))
    .orderBy(desc(personalRecords.achievedAt));

  return rows.map((r) => ({ ...r, value: Number(r.value) }));
}
