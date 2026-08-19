import { dateKey } from "./date-buckets";

export interface StreakResult {
  current: number;
  longest: number;
}

const DAY_MS = 86_400_000;

/**
 * Racha de entrenamientos (CLAUDE.md §5.4). `trainingDates` son los
 * `startedAt` de sesiones completadas — se agrupan por día calendario, no
 * por sesión (dos entrenamientos el mismo día cuentan una vez). La racha
 * actual admite que "hoy" todavía no se haya entrenado sin romperla (se
 * mira también "ayer"), para no penalizar a alguien que revisa la app a
 * la mañana antes de ir al gym.
 */
export function calculateStreak(
  trainingDates: Date[],
  today: Date = new Date(),
): StreakResult {
  const uniqueDays = new Set(trainingDates.map(dateKey));
  if (uniqueDays.size === 0) return { current: 0, longest: 0 };

  const sortedDays = [...uniqueDays].sort();

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(`${sortedDays[i - 1]}T00:00:00Z`);
    const curr = new Date(`${sortedDays[i]}T00:00:00Z`);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / DAY_MS);
    run = diffDays === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const todayKey = dateKey(today);
  const yesterdayKey = dateKey(new Date(today.getTime() - DAY_MS));
  let cursorKey: string | null = null;
  if (uniqueDays.has(todayKey)) cursorKey = todayKey;
  else if (uniqueDays.has(yesterdayKey)) cursorKey = yesterdayKey;

  let current = 0;
  if (cursorKey) {
    current = 1;
    let cursorDate = new Date(`${cursorKey}T00:00:00Z`);
    for (;;) {
      const prevDate = new Date(cursorDate.getTime() - DAY_MS);
      if (!uniqueDays.has(dateKey(prevDate))) break;
      current += 1;
      cursorDate = prevDate;
    }
  }

  return { current, longest };
}
