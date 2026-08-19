import { and, desc, eq, gte } from "drizzle-orm";
import type { Database } from "@/db";
import { routineDays, routines, workoutSessions, type WorkoutSession } from "@/db/schema";

/** Mismo principio que el resto de src/server/db: todo filtra por userId. */

export async function listCompletedSessionsForUser(
  db: Database,
  userId: string,
  limit = 30,
): Promise<(WorkoutSession & { dayName: string | null; routineName: string | null })[]> {
  const rows = await db
    .select({
      session: workoutSessions,
      dayName: routineDays.name,
      routineName: routines.name,
    })
    .from(workoutSessions)
    .leftJoin(routineDays, eq(routineDays.id, workoutSessions.routineDayId))
    .leftJoin(routines, eq(routines.id, routineDays.routineId))
    .where(
      and(eq(workoutSessions.userId, userId), eq(workoutSessions.status, "completed")),
    )
    .orderBy(desc(workoutSessions.startedAt))
    .limit(limit);

  return rows.map((r) => ({
    ...r.session,
    dayName: r.dayName,
    routineName: r.routineName,
  }));
}

export async function getSessionDetailForUser(
  db: Database,
  userId: string,
  sessionId: string,
) {
  return db.query.workoutSessions.findFirst({
    where: (s, { and: andOp, eq: eqOp }) =>
      andOp(eqOp(s.id, sessionId), eqOp(s.userId, userId)),
    with: {
      routineDay: { with: { routine: true } },
      sets: {
        orderBy: (s, { asc }) => [asc(s.order)],
        with: { exercise: true },
      },
    },
  });
}

export type SessionDetail = NonNullable<
  Awaited<ReturnType<typeof getSessionDetailForUser>>
>;

/** Fechas de sesiones completadas, para el heatmap y la racha — sin límite: la racha necesita el histórico completo. */
export async function getCompletedSessionDatesForUser(
  db: Database,
  userId: string,
  since?: Date,
): Promise<Date[]> {
  const rows = await db
    .select({ startedAt: workoutSessions.startedAt })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.status, "completed"),
        since ? gte(workoutSessions.startedAt, since) : undefined,
      ),
    );
  return rows.map((r) => r.startedAt);
}

/** Rutina del día usado en la sesión completada más reciente — sirve de referencia para la adherencia. */
export async function getMostRecentRoutineForUser(db: Database, userId: string) {
  const [row] = await db
    .select({ routine: routines })
    .from(workoutSessions)
    .innerJoin(routineDays, eq(routineDays.id, workoutSessions.routineDayId))
    .innerJoin(routines, eq(routines.id, routineDays.routineId))
    .where(
      and(eq(workoutSessions.userId, userId), eq(workoutSessions.status, "completed")),
    )
    .orderBy(desc(workoutSessions.startedAt))
    .limit(1);
  return row?.routine;
}
