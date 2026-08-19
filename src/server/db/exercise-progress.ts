import { and, asc, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { setLogs, workoutSessions } from "@/db/schema";
import type { ExerciseSetPoint } from "@/lib/exercise-progress";

export async function getExerciseHistoryForUser(
  db: Database,
  userId: string,
  exerciseId: string,
): Promise<ExerciseSetPoint[]> {
  const rows = await db
    .select({
      startedAt: workoutSessions.startedAt,
      weightKg: setLogs.weightKg,
      reps: setLogs.reps,
      failed: setLogs.failed,
    })
    .from(setLogs)
    .innerJoin(workoutSessions, eq(workoutSessions.id, setLogs.sessionId))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(setLogs.exerciseId, exerciseId),
        eq(workoutSessions.status, "completed"),
      ),
    )
    .orderBy(asc(workoutSessions.startedAt));

  return rows
    .filter((r) => !r.failed)
    .map((r) => ({
      date: r.startedAt.toISOString().slice(0, 10),
      weightKg: r.weightKg != null ? Number(r.weightKg) : null,
      reps: r.reps,
    }));
}
