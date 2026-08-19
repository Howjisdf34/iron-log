import type { Database } from "@/db";
import type { Exercise, ExerciseMedia, SetLog } from "@/db/schema";
import {
  getDistinctExerciseOrderForSession,
  getLastCompletedSetLogsForExercise,
  getSessionWithDayForUser,
} from "@/server/db/workout-sessions";

export interface PlayerMedia {
  videoWebm: string | null;
  videoMp4: string | null;
  poster: string | null;
  /** loop.webp animado — fallback cuando el ejercicio no tiene video de wger. */
  animatedFallback: string | null;
  attribution: string | null;
}

export interface PlayerExerciseInfo {
  id: string;
  slug: string;
  nameEs: string;
  category: string;
  isUnilateral: boolean;
  tracksWeight: boolean;
  tracksReps: boolean;
  tracksTime: boolean;
  tracksDistance: boolean;
  instructionsEs: string[];
  defaultRestSeconds: number;
}

export interface PlayerPrescribedSet {
  setNumber: number;
  setType: string;
  targetReps: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetWeightKg: number | null;
  targetRpe: number | null;
  restSecondsOverride: number | null;
}

export interface PlayerLoggedSet {
  id: string;
  order: number;
  setType: string;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  restTakenSeconds: number | null;
  isPr: boolean;
  failed: boolean;
  completedAt: string | null;
}

export interface PlayerExerciseSlot {
  key: string;
  routineExerciseId: string | null;
  exercise: PlayerExerciseInfo;
  media: PlayerMedia | null;
  restSeconds: number;
  tempo: string | null;
  supersetGroup: number | null;
  order: number;
  prescribedSets: PlayerPrescribedSet[];
  lastTimeSets: PlayerLoggedSet[];
  loggedSets: PlayerLoggedSet[];
}

export interface PlayerData {
  sessionId: string;
  status: string;
  startedAt: string;
  routineDayId: string | null;
  dayName: string | null;
  exercises: PlayerExerciseSlot[];
}

export function toPlayerLoggedSet(s: SetLog): PlayerLoggedSet {
  return {
    id: s.id,
    order: s.order,
    setType: s.setType,
    weightKg: s.weightKg != null ? Number(s.weightKg) : null,
    reps: s.reps,
    rpe: s.rpe != null ? Number(s.rpe) : null,
    restTakenSeconds: s.restTakenSeconds,
    isPr: s.isPr,
    failed: s.failed,
    completedAt: s.completedAt ? s.completedAt.toISOString() : null,
  };
}

function toMedia(media: ExerciseMedia[]): PlayerMedia | null {
  if (media.length === 0) return null;
  const primary = media.find((m) => m.isPrimary) ?? media[0]!;
  const webm = media.find((m) => m.localPath.endsWith(".webm"))?.localPath ?? null;
  const mp4 = media.find((m) => m.localPath.endsWith(".mp4"))?.localPath ?? null;
  const gif = media.find((m) => m.type === "gif")?.localPath ?? null;
  return {
    videoWebm: webm ? `/media/${webm}` : null,
    videoMp4: mp4 ? `/media/${mp4}` : null,
    poster: primary.posterPath ? `/media/${primary.posterPath}` : null,
    animatedFallback: gif ? `/media/${gif}` : null,
    attribution: primary.attribution,
  };
}

function toExerciseInfo(exercise: Exercise): PlayerExerciseInfo {
  return {
    id: exercise.id,
    slug: exercise.slug,
    nameEs: exercise.nameEs,
    category: exercise.category,
    isUnilateral: exercise.isUnilateral,
    tracksWeight: exercise.tracksWeight,
    tracksReps: exercise.tracksReps,
    tracksTime: exercise.tracksTime,
    tracksDistance: exercise.tracksDistance,
    instructionsEs: exercise.instructionsEs,
    defaultRestSeconds: exercise.defaultRestSeconds,
  };
}

/**
 * Arma la cola de ejercicios del Workout Player para una sesión:
 * - Si viene de una rutina: los slots de `routine_exercises`, en orden,
 *   con su prescripción y su media.
 * - Si es entrenamiento libre (routineDayId null): reconstruye la cola a
 *   partir de los `set_logs` ya registrados (para reanudar) — ejercicios
 *   agregados sobre la marcha que aún no tienen ninguna serie no aparecen
 *   acá, el cliente los agrega a su cola local al elegirlos.
 */
export async function getPlayerData(
  db: Database,
  userId: string,
  sessionId: string,
): Promise<PlayerData | undefined> {
  const session = await getSessionWithDayForUser(db, userId, sessionId);
  if (!session) return undefined;

  // Agrupamos las series ya registradas por ejercicio (no por routineSetId
  // individual: una serie prescrita ≠ un slot, y en modo libre no hay
  // routineSetId en absoluto).
  const loggedBySlot = new Map<string, SetLog[]>();
  for (const log of session.sets) {
    const groupKey = `exercise:${log.exerciseId}`;
    const list = loggedBySlot.get(groupKey) ?? [];
    list.push(log);
    loggedBySlot.set(groupKey, list);
  }

  const exercisesOut: PlayerExerciseSlot[] = [];

  if (session.routineDay) {
    for (const re of session.routineDay.exercises) {
      const logged = (loggedBySlot.get(`exercise:${re.exerciseId}`) ?? [])
        .slice()
        .sort((a, b) => a.order - b.order);
      const { sets: lastTimeSets } = await getLastCompletedSetLogsForExercise(
        db,
        userId,
        re.exerciseId,
        sessionId,
      );

      exercisesOut.push({
        key: re.id,
        routineExerciseId: re.id,
        exercise: toExerciseInfo(re.exercise),
        media: toMedia(re.exercise.media),
        restSeconds: re.restSeconds ?? re.exercise.defaultRestSeconds,
        tempo: re.tempo,
        supersetGroup: re.supersetGroup,
        order: re.order,
        prescribedSets: re.sets.map((s) => ({
          setNumber: s.setNumber,
          setType: s.setType,
          targetReps: s.targetReps,
          targetRepsMin: s.targetRepsMin,
          targetRepsMax: s.targetRepsMax,
          targetWeightKg: s.targetWeightKg != null ? Number(s.targetWeightKg) : null,
          targetRpe: s.targetRpe != null ? Number(s.targetRpe) : null,
          restSecondsOverride: s.restSecondsOverride,
        })),
        lastTimeSets: lastTimeSets.map(toPlayerLoggedSet),
        loggedSets: logged.map(toPlayerLoggedSet),
      });
    }
  } else {
    // Entrenamiento libre: reconstruir cola desde los set_logs existentes.
    const exerciseIds = await getDistinctExerciseOrderForSession(db, sessionId);
    if (exerciseIds.length > 0) {
      const rows = await db.query.exercises.findMany({
        where: (e, { inArray }) => inArray(e.id, exerciseIds),
        with: { media: true },
      });
      const byId = new Map(rows.map((r) => [r.id, r]));

      for (const [index, exerciseId] of exerciseIds.entries()) {
        const exercise = byId.get(exerciseId);
        if (!exercise) continue;
        const logged = (loggedBySlot.get(`exercise:${exerciseId}`) ?? [])
          .slice()
          .sort((a, b) => a.order - b.order);
        const { sets: lastTimeSets } = await getLastCompletedSetLogsForExercise(
          db,
          userId,
          exerciseId,
          sessionId,
        );

        exercisesOut.push({
          key: exerciseId,
          routineExerciseId: null,
          exercise: toExerciseInfo(exercise),
          media: toMedia(exercise.media),
          restSeconds: exercise.defaultRestSeconds,
          tempo: null,
          supersetGroup: null,
          order: index,
          prescribedSets: [],
          lastTimeSets: lastTimeSets.map(toPlayerLoggedSet),
          loggedSets: logged.map(toPlayerLoggedSet),
        });
      }
    }
  }

  return {
    sessionId: session.id,
    status: session.status,
    startedAt: session.startedAt.toISOString(),
    routineDayId: session.routineDayId,
    dayName: session.routineDay?.name ?? null,
    exercises: exercisesOut,
  };
}

/** Info de un ejercicio para agregarlo sobre la marcha en un entrenamiento libre. */
export async function getExercisePlayerInfo(
  db: Database,
  userId: string,
  sessionId: string,
  exerciseId: string,
): Promise<Omit<PlayerExerciseSlot, "order"> | undefined> {
  const exercise = await db.query.exercises.findFirst({
    where: (e, { eq }) => eq(e.id, exerciseId),
    with: { media: true },
  });
  if (!exercise) return undefined;

  const { sets: lastTimeSets } = await getLastCompletedSetLogsForExercise(
    db,
    userId,
    exerciseId,
    sessionId,
  );

  return {
    key: exerciseId,
    routineExerciseId: null,
    exercise: toExerciseInfo(exercise),
    media: toMedia(exercise.media),
    restSeconds: exercise.defaultRestSeconds,
    tempo: null,
    supersetGroup: null,
    prescribedSets: [],
    lastTimeSets: lastTimeSets.map(toPlayerLoggedSet),
    loggedSets: [],
  };
}
