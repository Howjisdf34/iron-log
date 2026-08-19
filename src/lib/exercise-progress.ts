import { estimateOneRepMax, estimateOneRepMaxBrzycki } from "./one-rep-max";
import { isoWeekKey } from "./date-buckets";

export interface ExerciseSetPoint {
  date: string;
  weightKg: number | null;
  reps: number | null;
}

export interface OneRepMaxPoint {
  date: string;
  epley: number;
  brzycki: number;
}

/** Mejor serie de cada sesión (por Epley) y su estimado con ambas fórmulas — CLAUDE.md §5.4 pide mostrar cuál se usa. */
export function estimatedOneRepMaxOverTime(points: ExerciseSetPoint[]): OneRepMaxPoint[] {
  const bestByDate = new Map<string, { weightKg: number; reps: number }>();
  for (const p of points) {
    if (p.weightKg == null || p.reps == null || p.weightKg <= 0 || p.reps <= 0) continue;
    const existing = bestByDate.get(p.date);
    if (
      !existing ||
      estimateOneRepMax(p.weightKg, p.reps) >
        estimateOneRepMax(existing.weightKg, existing.reps)
    ) {
      bestByDate.set(p.date, { weightKg: p.weightKg, reps: p.reps });
    }
  }
  return [...bestByDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, s]) => ({
      date,
      epley: Math.round(estimateOneRepMax(s.weightKg, s.reps) * 10) / 10,
      brzycki: Math.round(estimateOneRepMaxBrzycki(s.weightKg, s.reps) * 10) / 10,
    }));
}

export function maxWeightOverTime(
  points: ExerciseSetPoint[],
): { date: string; weightKg: number }[] {
  const bestByDate = new Map<string, number>();
  for (const p of points) {
    if (p.weightKg == null) continue;
    const existing = bestByDate.get(p.date) ?? 0;
    if (p.weightKg > existing) bestByDate.set(p.date, p.weightKg);
  }
  return [...bestByDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, weightKg]) => ({ date, weightKg }));
}

export interface WeeklyVolumePoint {
  week: string;
  volumeKg: number;
  totalReps: number;
}

export function weeklyVolume(points: ExerciseSetPoint[]): WeeklyVolumePoint[] {
  const byWeek = new Map<string, WeeklyVolumePoint>();
  for (const p of points) {
    const week = isoWeekKey(new Date(p.date));
    const entry = byWeek.get(week) ?? { week, volumeKg: 0, totalReps: 0 };
    entry.volumeKg += (p.weightKg ?? 0) * (p.reps ?? 0);
    entry.totalReps += p.reps ?? 0;
    byWeek.set(week, entry);
  }
  return [...byWeek.values()].sort((a, b) => a.week.localeCompare(b.week));
}
