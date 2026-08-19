"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { listStagger } from "@/lib/motion/springs";
import type { FinishSessionSummary } from "@/server/workout/mutations";

interface WorkoutSummaryProps {
  summary: FinishSessionSummary;
  prMessages: string[];
  dayName: string | null;
  onDone: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0 ? `${h}h ${mm}min` : `${mm} min`;
}

/** Pantalla de resumen "wrapped" — una recompensa, no un formulario (CLAUDE.md §5.3). */
export function WorkoutSummary({
  summary,
  prMessages,
  dayName,
  onDone,
}: WorkoutSummaryProps) {
  const volumeDelta =
    summary.previousVolumeKg != null
      ? summary.totalVolumeKg - summary.previousVolumeKg
      : null;
  const setsDelta =
    summary.previousTotalSets != null
      ? summary.totalSets - summary.previousTotalSets
      : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background p-6"
    >
      <motion.div
        variants={listStagger.container}
        initial="hidden"
        animate="show"
        className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 py-10 text-center"
      >
        <motion.div variants={listStagger.item}>
          <p className="text-sm text-muted-foreground">Entrenamiento completo</p>
          <h1 className="text-2xl font-bold text-foreground">
            {dayName ?? "Entrenamiento libre"}
          </h1>
        </motion.div>

        <motion.div variants={listStagger.item} className="grid grid-cols-3 gap-3">
          <StatCard label="Duración" value={formatDuration(summary.durationSeconds)} />
          <StatCard label="Series" value={String(summary.totalSets)} delta={setsDelta} />
          <StatCard
            label="Volumen"
            value={`${Math.round(summary.totalVolumeKg)}kg`}
            delta={volumeDelta != null ? Math.round(volumeDelta) : null}
          />
        </motion.div>

        {prMessages.length > 0 ? (
          <motion.div
            variants={listStagger.item}
            className="space-y-2 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-left"
          >
            <p className="text-sm font-semibold text-primary">🔥 Records personales</p>
            <ul className="space-y-1 text-sm text-foreground">
              {prMessages.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </motion.div>
        ) : null}

        <motion.div variants={listStagger.item}>
          <Button type="button" size="touch" className="w-full" onClick={onDone}>
            Listo
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: number | null;
}) {
  return (
    <div className="rounded-2xl bg-card p-3">
      <p className="text-lg font-bold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {delta != null && delta !== 0 ? (
        <p
          className={`text-xs tabular-nums ${delta > 0 ? "text-success" : "text-destructive"}`}
        >
          {delta > 0 ? "+" : ""}
          {delta} vs. anterior
        </p>
      ) : null}
    </div>
  );
}
