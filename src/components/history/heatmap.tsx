import { dateKey, startOfIsoWeek } from "@/lib/date-buckets";

interface TrainingHeatmapProps {
  trainingDates: string[];
  /** Fecha de "hoy" en YYYY-MM-DD, calculada por el server component padre — nunca `new Date()` acá (llamarlo en render es impuro, ver ADR-012). */
  todayKey: string;
  weeks?: number;
}

const DAY_MS = 86_400_000;

/** Heatmap tipo GitHub de días entrenados (CLAUDE.md §5.4), adaptado a mobile: scroll horizontal en vez de comprimir todo el año. */
export function TrainingHeatmap({
  trainingDates,
  todayKey,
  weeks = 18,
}: TrainingHeatmapProps) {
  const trainedSet = new Set(trainingDates);
  const today = new Date(`${todayKey}T00:00:00Z`);
  const currentWeekStart = startOfIsoWeek(today);

  const weekStarts: Date[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    weekStarts.push(new Date(currentWeekStart.getTime() - i * 7 * DAY_MS));
  }

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex gap-1">
        {weekStarts.map((weekStart) => (
          <div key={weekStart.toISOString()} className="flex flex-col gap-1">
            {Array.from({ length: 7 }).map((_, dayIndex) => {
              const day = new Date(weekStart.getTime() + dayIndex * DAY_MS);
              const key = dateKey(day);
              const trained = trainedSet.has(key);
              const isToday = key === todayKey;
              const isFuture = day.getTime() > today.getTime();
              return (
                <div
                  key={key}
                  title={key}
                  className={
                    isFuture
                      ? "size-3 rounded-sm bg-transparent"
                      : trained
                        ? "size-3 rounded-sm bg-primary"
                        : isToday
                          ? "size-3 rounded-sm bg-accent-soft"
                          : "size-3 rounded-sm bg-muted"
                  }
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
