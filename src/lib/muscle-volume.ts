import { isoWeekKey } from "./date-buckets";

export interface MuscleSetPoint {
  date: string;
  primaryMuscleIds: string[];
  secondaryMuscleIds: string[];
}

export interface WeeklyMuscleVolume {
  week: string;
  muscleId: string;
  effectiveSets: number;
}

/** Un músculo secundario cuenta la mitad de una serie efectiva — heurística estándar de volumen de entrenamiento, no una medición exacta. */
const SECONDARY_WEIGHT = 0.5;

/**
 * Volumen semanal por grupo muscular en "series efectivas" (CLAUDE.md
 * §5.4). MEV/MAV acá son puntos de referencia orientativos de uso común
 * en la literatura de hipertrofia (Renaissance Periodization y similares),
 * no una prescripción médica ni personalizada.
 */
export const MEV_REFERENCE_SETS_PER_WEEK = 10;
export const MAV_REFERENCE_SETS_PER_WEEK = 20;

export function weeklyMuscleVolume(points: MuscleSetPoint[]): WeeklyMuscleVolume[] {
  const map = new Map<string, WeeklyMuscleVolume>();
  const add = (week: string, muscleId: string, amount: number) => {
    const key = `${week}::${muscleId}`;
    const existing = map.get(key) ?? { week, muscleId, effectiveSets: 0 };
    existing.effectiveSets += amount;
    map.set(key, existing);
  };

  for (const p of points) {
    const week = isoWeekKey(new Date(p.date));
    for (const muscleId of p.primaryMuscleIds) add(week, muscleId, 1);
    for (const muscleId of p.secondaryMuscleIds) add(week, muscleId, SECONDARY_WEIGHT);
  }

  return [...map.values()].sort(
    (a, b) => a.week.localeCompare(b.week) || a.muscleId.localeCompare(b.muscleId),
  );
}
