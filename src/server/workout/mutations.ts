import { and, desc, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { personalRecords, setLogs, workoutSessions, type SetLog } from "@/db/schema";
import { assertDayOwnership } from "@/server/db/routines";
import {
  getActiveSessionForUser,
  getPreviousCompletedSessionForDay,
  getSessionForUser,
} from "@/server/db/workout-sessions";
import { newId } from "@/lib/id";
import { estimateOneRepMax } from "@/lib/one-rep-max";
import type {
  FinishSessionInput,
  LogSetInput,
  UpdateSetLogInput,
} from "@/lib/validation/workout";

/**
 * Lógica de negocio pura del Workout Player — mismo patrón que
 * src/server/routines/mutations.ts (recibe `userId` explícito, testable
 * sin mockear next-auth).
 */

export async function startSessionForUser(
  db: Database,
  userId: string,
  routineDayId: string | null,
): Promise<string> {
  // Si ya hay una sesión en curso, la retomamos en vez de crear otra —
  // evita sesiones huérfanas si el usuario tapea "Empezar" dos veces o
  // cierra la app a medias. El banner de reanudar cubre el resto.
  const active = await getActiveSessionForUser(db, userId);
  if (active) return active.id;

  if (routineDayId) {
    await assertDayOwnership(db, userId, routineDayId);
  }

  const [session] = await db
    .insert(workoutSessions)
    .values({
      userId,
      routineDayId,
      startedAt: new Date(),
      status: "in_progress",
      clientId: newId(),
    })
    .returning({ id: workoutSessions.id });
  return session!.id;
}

async function isNewPersonalRecord(
  db: Database,
  userId: string,
  exerciseId: string,
  type: "1rm_estimated" | "weight",
  value: number,
): Promise<boolean> {
  const [best] = await db
    .select({ value: personalRecords.value })
    .from(personalRecords)
    .where(
      and(
        eq(personalRecords.userId, userId),
        eq(personalRecords.exerciseId, exerciseId),
        eq(personalRecords.type, type),
      ),
    )
    .orderBy(desc(personalRecords.value))
    .limit(1);
  if (!best) return true;
  return value > Number(best.value) + 0.001;
}

async function recordPersonalRecord(
  db: Database,
  userId: string,
  exerciseId: string,
  type: "1rm_estimated" | "weight",
  value: number,
  setLogId: string,
): Promise<void> {
  await db.insert(personalRecords).values({
    userId,
    exerciseId,
    type,
    value: value.toFixed(2),
    setLogId,
    achievedAt: new Date(),
  });
}

export async function logSetForUser(
  db: Database,
  userId: string,
  input: LogSetInput,
): Promise<{ setLog: SetLog; prTypes: ("1rm_estimated" | "weight")[] }> {
  const session = await getSessionForUser(db, userId, input.sessionId);
  if (session.status !== "in_progress") throw new Error("La sesión ya terminó");

  // `clientId` es la clave de idempotencia (CLAUDE.md §5.5): si el outbox
  // offline reintenta el mismo envío (o el usuario duplica el tap antes de
  // que el primero confirme), onConflictDoNothing hace que el segundo
  // intento sea un no-op en vez de una serie duplicada.
  const inserted = await db
    .insert(setLogs)
    .values({
      sessionId: input.sessionId,
      exerciseId: input.exerciseId,
      routineSetId: input.routineSetId ?? null,
      order: input.order,
      setType: input.setType,
      weightKg: input.weightKg != null ? String(input.weightKg) : null,
      reps: input.reps ?? null,
      rpe: input.rpe != null ? String(input.rpe) : null,
      timeSeconds: input.timeSeconds ?? null,
      distanceM: input.distanceM != null ? String(input.distanceM) : null,
      restTakenSeconds: input.restTakenSeconds ?? null,
      failed: input.failed ?? false,
      notes: input.notes ?? null,
      completedAt: new Date(),
      clientId: input.clientId,
    })
    .onConflictDoNothing({ target: setLogs.clientId })
    .returning();

  if (inserted.length === 0) {
    // Reintento de un envío que ya se procesó — devolvemos la fila existente
    // sin repetir la detección de PR (ya se hizo la primera vez).
    const [existing] = await db
      .select()
      .from(setLogs)
      .where(eq(setLogs.clientId, input.clientId))
      .limit(1);
    return { setLog: existing!, prTypes: [] };
  }

  let setLog = inserted[0]!;
  const prTypes: ("1rm_estimated" | "weight")[] = [];

  if (!setLog.failed && input.weightKg != null && input.weightKg > 0) {
    if (input.reps != null && input.reps > 0) {
      const est1rm = estimateOneRepMax(input.weightKg, input.reps);
      if (
        await isNewPersonalRecord(db, userId, input.exerciseId, "1rm_estimated", est1rm)
      ) {
        await recordPersonalRecord(
          db,
          userId,
          input.exerciseId,
          "1rm_estimated",
          est1rm,
          setLog.id,
        );
        prTypes.push("1rm_estimated");
      }
    }
    if (
      await isNewPersonalRecord(db, userId, input.exerciseId, "weight", input.weightKg)
    ) {
      await recordPersonalRecord(
        db,
        userId,
        input.exerciseId,
        "weight",
        input.weightKg,
        setLog.id,
      );
      prTypes.push("weight");
    }
  }

  if (prTypes.length > 0) {
    const [updated] = await db
      .update(setLogs)
      .set({ isPr: true })
      .where(eq(setLogs.id, setLog.id))
      .returning();
    setLog = updated!;
  }

  return { setLog, prTypes };
}

async function assertSetLogOwnership(
  db: Database,
  userId: string,
  setLogId: string,
): Promise<{ sessionId: string }> {
  const [row] = await db
    .select({ sessionId: setLogs.sessionId })
    .from(setLogs)
    .innerJoin(workoutSessions, eq(workoutSessions.id, setLogs.sessionId))
    .where(and(eq(setLogs.id, setLogId), eq(workoutSessions.userId, userId)))
    .limit(1);
  if (!row) throw new Error("Serie no encontrada");
  return row;
}

export async function updateSetLogForUser(
  db: Database,
  userId: string,
  input: UpdateSetLogInput,
): Promise<string> {
  const { sessionId } = await assertSetLogOwnership(db, userId, input.setLogId);

  await db
    .update(setLogs)
    .set({
      ...(input.weightKg !== undefined
        ? { weightKg: input.weightKg != null ? String(input.weightKg) : null }
        : {}),
      ...(input.reps !== undefined ? { reps: input.reps } : {}),
      ...(input.rpe !== undefined
        ? { rpe: input.rpe != null ? String(input.rpe) : null }
        : {}),
      ...(input.failed !== undefined ? { failed: input.failed } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      updatedAt: new Date(),
    })
    .where(eq(setLogs.id, input.setLogId));

  return sessionId;
}

export async function deleteSetLogForUser(
  db: Database,
  userId: string,
  setLogId: string,
): Promise<string> {
  const { sessionId } = await assertSetLogOwnership(db, userId, setLogId);
  await db.delete(setLogs).where(eq(setLogs.id, setLogId));
  return sessionId;
}

export async function abandonSessionForUser(
  db: Database,
  userId: string,
  sessionId: string,
): Promise<void> {
  await getSessionForUser(db, userId, sessionId);
  await db
    .update(workoutSessions)
    .set({ status: "abandoned", finishedAt: new Date() })
    .where(eq(workoutSessions.id, sessionId));
}

export interface FinishSessionSummary {
  totalVolumeKg: number;
  totalSets: number;
  durationSeconds: number;
  previousVolumeKg: number | null;
  previousTotalSets: number | null;
}

export async function finishSessionForUser(
  db: Database,
  userId: string,
  input: FinishSessionInput,
): Promise<FinishSessionSummary> {
  const session = await getSessionForUser(db, userId, input.sessionId);
  if (session.status !== "in_progress") throw new Error("La sesión ya terminó");

  const logged = await db.select().from(setLogs).where(eq(setLogs.sessionId, session.id));
  const completedSets = logged.filter((s) => !s.failed);
  const totalVolumeKg = completedSets.reduce(
    (sum, s) => sum + (s.weightKg ? Number(s.weightKg) : 0) * (s.reps ?? 0),
    0,
  );
  const totalSets = completedSets.length;
  const finishedAt = new Date();
  const durationSeconds = Math.round(
    (finishedAt.getTime() - session.startedAt.getTime()) / 1000,
  );

  await db
    .update(workoutSessions)
    .set({
      status: "completed",
      finishedAt,
      durationSeconds,
      totalVolumeKg: totalVolumeKg.toFixed(2),
      totalSets,
      bodyweightKg: input.bodyweightKg != null ? String(input.bodyweightKg) : null,
      mood: input.mood ?? null,
      energy: input.energy ?? null,
      notes: input.notes ?? null,
    })
    .where(eq(workoutSessions.id, session.id));

  let previousVolumeKg: number | null = null;
  let previousTotalSets: number | null = null;
  if (session.routineDayId) {
    const previous = await getPreviousCompletedSessionForDay(
      db,
      userId,
      session.routineDayId,
      session.id,
    );
    if (previous) {
      previousVolumeKg =
        previous.totalVolumeKg != null ? Number(previous.totalVolumeKg) : null;
      previousTotalSets = previous.totalSets;
    }
  }

  return {
    totalVolumeKg,
    totalSets,
    durationSeconds,
    previousVolumeKg,
    previousTotalSets,
  };
}
