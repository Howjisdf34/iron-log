import type { Database } from "@/db";
import { calculateStreak, type StreakResult } from "@/lib/streak";
import {
  getCompletedSessionDatesForUser,
  getMostRecentRoutineForUser,
} from "@/server/db/history";

export interface TrainingOverview {
  streak: StreakResult;
  /** Días con al menos una sesión completada, últimos 12 meses — para el heatmap. */
  trainingDates: string[];
  /** % de sesiones de los últimos 7 días vs. daysPerWeek de la rutina más reciente. null si nunca completó una sesión ligada a una rutina. */
  adherencePct: number | null;
}

const DAY_MS = 86_400_000;

export async function getTrainingOverviewForUser(
  db: Database,
  userId: string,
): Promise<TrainingOverview> {
  const allDates = await getCompletedSessionDatesForUser(db, userId);
  const streak = calculateStreak(allDates);

  const oneYearAgo = new Date(Date.now() - 365 * DAY_MS);
  const trainingDates = allDates
    .filter((d) => d >= oneYearAgo)
    .map((d) => d.toISOString().slice(0, 10));

  const sevenDaysAgo = new Date(Date.now() - 7 * DAY_MS);
  const recentCount = allDates.filter((d) => d >= sevenDaysAgo).length;
  const routine = await getMostRecentRoutineForUser(db, userId);
  const adherencePct = routine
    ? Math.min(100, Math.round((recentCount / routine.daysPerWeek) * 100))
    : null;

  return { streak, trainingDates, adherencePct };
}
