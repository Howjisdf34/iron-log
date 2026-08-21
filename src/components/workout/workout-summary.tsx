"use client";

import { motion } from "motion/react";
import { listStagger } from "@/lib/motion/springs";
import type { FinishSessionSummary } from "@/server/workout/mutations";

interface WorkoutSummaryProps {
  summary: FinishSessionSummary;
  prMessages: string[];
  dayName: string | null;
  startedAt: string;
  onDone: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0 ? `${h}h ${mm}min` : `${mm} min`;
}

function MetricRow({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: number | null;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border py-4 last:border-b-0">
      <span className="text-[15px] text-ink2">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </span>
        {delta != null && delta !== 0 ? (
          <span
            className={`text-xs font-semibold tabular-nums ${
              delta > 0 ? "text-success" : "text-muted-foreground"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
        ) : null}
      </span>
    </div>
  );
}

/** Pantalla de resumen "wrapped" — una recompensa, no un formulario (CLAUDE.md §5.3). */
export function WorkoutSummary({
  summary,
  prMessages,
  dayName,
  startedAt,
  onDone,
}: WorkoutSummaryProps) {
  const volumeDelta =
    summary.previousVolumeKg != null
      ? Math.round(summary.totalVolumeKg - summary.previousVolumeKg)
      : null;
  const setsDelta =
    summary.previousTotalSets != null
      ? summary.totalSets - summary.previousTotalSets
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background px-[22px] pt-[26px] pb-10"
    >
      <motion.div
        variants={listStagger.container}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-md"
      >
        <motion.div variants={listStagger.item}>
          <p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">
            Entrenamiento completo
          </p>
          <h1 className="mt-1 text-[36px] leading-tight font-semibold tracking-[-0.03em] text-foreground">
            {dayName ?? "Entrenamiento libre"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(startedAt).toLocaleDateString("es-MX", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </motion.div>

        <motion.div variants={listStagger.item} className="mt-[34px]">
          <MetricRow label="Duración" value={formatDuration(summary.durationSeconds)} />
          <MetricRow
            label="Volumen"
            value={`${Math.round(summary.totalVolumeKg)} kg`}
            delta={volumeDelta}
          />
          <MetricRow label="Series" value={String(summary.totalSets)} delta={setsDelta} />
          {summary.averageRpe != null ? (
            <MetricRow label="RPE medio" value={String(summary.averageRpe)} />
          ) : null}
        </motion.div>

        {prMessages.length > 0 ? (
          <motion.div
            variants={listStagger.item}
            className="mt-7 space-y-2 rounded-[22px] bg-accent-soft p-5"
          >
            <p className="text-xs font-semibold tracking-[0.09em] text-primary uppercase">
              Récord personal
            </p>
            <ul className="space-y-1.5">
              {prMessages.map((m, i) => (
                <li key={i} className="text-[15px] font-medium text-foreground">
                  {m}
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}

        <motion.div variants={listStagger.item} className="mt-8">
          <button
            type="button"
            onClick={onDone}
            className="w-full rounded-2xl bg-foreground py-5 text-base font-semibold text-background"
          >
            Listo
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
