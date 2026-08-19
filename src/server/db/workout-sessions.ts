import { and, desc, eq, ne } from "drizzle-orm";
import type { Database } from "@/db";
import { setLogs, workoutSessions, type SetLog, type WorkoutSession } from "@/db/schema";

/** Mismo principio que src/server/db/routines.ts: todo filtra por userId. */

export async function getActiveSessionForUser(
  db: Database,
  userId: string,
): Promise<WorkoutSession | undefined> {
  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(
      and(eq(workoutSessions.userId, userId), eq(workoutSessions.status, "in_progress")),
    )
    .orderBy(desc(workoutSessions.startedAt))
    .limit(1);
  return session;
}

export async function getSessionForUser(
  db: Database,
  userId: string,
  sessionId: string,
): Promise<WorkoutSession> {
  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)))
    .limit(1);
  if (!session) throw new Error("Sesión no encontrada");
  return session;
}

/** Sesión completa: día de rutina (si aplica) -> ejercicios -> series prescritas + media, y las series ya registradas en esta sesión. */
export async function getSessionWithDayForUser(
  db: Database,
  userId: string,
  sessionId: string,
) {
  return db.query.workoutSessions.findFirst({
    where: (s, { and: andOp, eq: eqOp }) =>
      andOp(eqOp(s.id, sessionId), eqOp(s.userId, userId)),
    with: {
      routineDay: {
        with: {
          exercises: {
            orderBy: (e, { asc }) => [asc(e.order)],
            with: {
              exercise: { with: { media: true } },
              sets: { orderBy: (s, { asc }) => [asc(s.setNumber)] },
            },
          },
        },
      },
      sets: { orderBy: (s, { asc }) => [asc(s.order)] },
    },
  });
}

/** Series de la sesión completada más reciente en la que se registró este ejercicio (para "la última vez"). */
export async function getLastCompletedSetLogsForExercise(
  db: Database,
  userId: string,
  exerciseId: string,
  excludeSessionId: string,
): Promise<{ sessionStartedAt: Date | null; sets: SetLog[] }> {
  const [lastSession] = await db
    .select({ id: workoutSessions.id, startedAt: workoutSessions.startedAt })
    .from(workoutSessions)
    .innerJoin(setLogs, eq(setLogs.sessionId, workoutSessions.id))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(setLogs.exerciseId, exerciseId),
        ne(workoutSessions.id, excludeSessionId),
      ),
    )
    .orderBy(desc(workoutSessions.startedAt))
    .limit(1);

  if (!lastSession) return { sessionStartedAt: null, sets: [] };

  const sets = await db
    .select()
    .from(setLogs)
    .where(and(eq(setLogs.sessionId, lastSession.id), eq(setLogs.exerciseId, exerciseId)))
    .orderBy(setLogs.order);

  return { sessionStartedAt: lastSession.startedAt, sets };
}

export async function getPreviousCompletedSessionForDay(
  db: Database,
  userId: string,
  routineDayId: string,
  excludeSessionId: string,
): Promise<WorkoutSession | undefined> {
  const [prev] = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.routineDayId, routineDayId),
        eq(workoutSessions.status, "completed"),
        ne(workoutSessions.id, excludeSessionId),
      ),
    )
    .orderBy(desc(workoutSessions.startedAt))
    .limit(1);
  return prev;
}

/** Ids de ejercicio distintos ya registrados en la sesión, en orden de primera aparición — reconstruye la cola de un entrenamiento libre al reanudar. */
export async function getDistinctExerciseOrderForSession(
  db: Database,
  sessionId: string,
): Promise<string[]> {
  const rows = await db
    .select({ exerciseId: setLogs.exerciseId })
    .from(setLogs)
    .where(eq(setLogs.sessionId, sessionId))
    .orderBy(setLogs.order);

  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const row of rows) {
    if (!seen.has(row.exerciseId)) {
      seen.add(row.exerciseId);
      ordered.push(row.exerciseId);
    }
  }
  return ordered;
}
