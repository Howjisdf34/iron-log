export interface DatedValue {
  date: string;
  value: number;
}

/** Media móvil de N puntos (CLAUDE.md §5.4 pide 7 días para peso corporal). */
export function movingAverage<T extends DatedValue>(
  points: T[],
  windowSize = 7,
): (T & { avg: number })[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((point, index) => {
    const windowStart = Math.max(0, index - windowSize + 1);
    const window = sorted.slice(windowStart, index + 1);
    const avg = window.reduce((sum, w) => sum + w.value, 0) / window.length;
    return { ...point, avg };
  });
}
