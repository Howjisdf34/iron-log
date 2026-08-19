import { and, eq, gte } from "drizzle-orm";
import type { Database } from "@/db";
import { exercises, setLogs, workoutSessions } from "@/db/schema";
import type { MuscleSetPoint } from "@/lib/muscle-volume";

export async function getMuscleSetPointsForUser(
  db: Database,
  userId: string,
  since: Date,
): Promise<MuscleSetPoint[]> {
  const rows = await db
    .select({
      startedAt: workoutSessions.startedAt,
      failed: setLogs.failed,
      primaryMuscles: exercises.primaryMuscles,
      secondaryMuscles: exercises.secondaryMuscles,
    })
    .from(setLogs)
    .innerJoin(workoutSessions, eq(workoutSessions.id, setLogs.sessionId))
    .innerJoin(exercises, eq(exercises.id, setLogs.exerciseId))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.status, "completed"),
        gte(workoutSessions.startedAt, since),
      ),
    );

  return rows
    .filter((r) => !r.failed)
    .map((r) => ({
      date: r.startedAt.toISOString().slice(0, 10),
      primaryMuscleIds: r.primaryMuscles,
      secondaryMuscleIds: r.secondaryMuscles,
    }));
}
