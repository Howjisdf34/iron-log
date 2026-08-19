/**
 * Estimación de duración de sesión: series × tempo + descansos (CLAUDE.md
 * §5.2). Pura y testeable — sirve tanto para plantillas (antes de guardar
 * en DB) como para rutinas ya guardadas.
 */

export interface DurationSet {
  targetReps?: number | null;
  targetRepsMin?: number | null;
  targetRepsMax?: number | null;
}

export interface DurationExercise {
  tempo?: string | null;
  restSeconds?: number | null;
  sets: DurationSet[];
}

const DEFAULT_TEMPO_SECONDS_PER_REP = 4; // "2-0-2-0"
const DEFAULT_REST_SECONDS = 90;
const DEFAULT_REPS_GUESS = 10;

function tempoSecondsPerRep(tempo: string | null | undefined): number {
  if (!tempo) return DEFAULT_TEMPO_SECONDS_PER_REP;
  const parts = tempo.split("-").map(Number);
  if (parts.some((p) => Number.isNaN(p))) return DEFAULT_TEMPO_SECONDS_PER_REP;
  const sum = parts.reduce((a, b) => a + b, 0);
  return sum > 0 ? sum : DEFAULT_TEMPO_SECONDS_PER_REP;
}

function repsEstimate(set: DurationSet): number {
  if (set.targetReps) return set.targetReps;
  if (set.targetRepsMin && set.targetRepsMax) {
    return Math.round((set.targetRepsMin + set.targetRepsMax) / 2);
  }
  return set.targetRepsMin ?? set.targetRepsMax ?? DEFAULT_REPS_GUESS;
}

/** @returns minutos estimados, redondeado. */
export function estimateSessionMinutes(exercises: DurationExercise[]): number {
  let totalSeconds = 0;
  for (const exercise of exercises) {
    const secondsPerRep = tempoSecondsPerRep(exercise.tempo);
    const rest = exercise.restSeconds ?? DEFAULT_REST_SECONDS;
    for (const set of exercise.sets) {
      totalSeconds += repsEstimate(set) * secondsPerRep + rest;
    }
  }
  return Math.round(totalSeconds / 60);
}
