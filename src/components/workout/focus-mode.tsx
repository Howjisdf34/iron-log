"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus } from "lucide-react";
import type { PlayerExerciseSlot } from "@/server/workout/player-data";
import type { SetRowValues } from "./set-row";

interface FocusModeProps {
  exercise: PlayerExerciseSlot;
  exerciseIndex: number;
  totalExercises: number;
  rowIndex: number;
  totalRowsForExercise: number;
  incrementKg: number;
  onComplete: (values: SetRowValues) => void;
  onSkip: () => void;
}

function FocusStepper({
  label,
  value,
  onChange,
  step,
  min,
  max,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
}) {
  function clamp(n: number) {
    return Math.min(max, Math.max(min, n));
  }
  return (
    <div className="rounded-[22px] bg-muted px-3.5 py-[18px]">
      <p className="text-center text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
        {label}
      </p>
      <div className="mt-1 flex items-center justify-center gap-5">
        <button
          type="button"
          aria-label={`Restar ${label}`}
          onClick={() => onChange(clamp((value ?? 0) - step))}
          className="flex size-[52px] items-center justify-center rounded-full bg-background text-foreground"
        >
          <Minus className="size-6" />
        </button>
        <span className="w-20 text-center text-[34px] font-semibold tabular-nums text-foreground">
          {value ?? "–"}
        </span>
        <button
          type="button"
          aria-label={`Sumar ${label}`}
          onClick={() => onChange(clamp((value ?? 0) + step))}
          className="flex size-[52px] items-center justify-center rounded-full bg-background text-foreground"
        >
          <Plus className="size-6" />
        </button>
      </div>
    </div>
  );
}

/** Modo Enfoque: una sola serie a pantalla completa (handoff de diseño §5b). */
export function FocusMode({
  exercise,
  exerciseIndex,
  totalExercises,
  rowIndex,
  totalRowsForExercise,
  incrementKg,
  onComplete,
  onSkip,
}: FocusModeProps) {
  const prescribed = exercise.prescribedSets[rowIndex];
  const lastTime = exercise.lastTimeSets[rowIndex];

  const [weightKg, setWeightKg] = useState<number | null>(
    prescribed?.targetWeightKg ?? lastTime?.weightKg ?? null,
  );
  const [reps, setReps] = useState<number | null>(
    prescribed?.targetReps ?? prescribed?.targetRepsMax ?? lastTime?.reps ?? null,
  );

  // Al avanzar a la siguiente serie (misma instancia del componente, sólo
  // cambian las props) hay que resincronizar los valores editables — patrón
  // ya usado en el proyecto para esto (ajustar estado durante el render).
  const [key, setKey] = useState(`${exercise.key}-${rowIndex}`);
  const nextKey = `${exercise.key}-${rowIndex}`;
  if (key !== nextKey) {
    setKey(nextKey);
    setWeightKg(prescribed?.targetWeightKg ?? lastTime?.weightKg ?? null);
    setReps(
      prescribed?.targetReps ?? prescribed?.targetRepsMax ?? lastTime?.reps ?? null,
    );
  }

  const targetLabel =
    prescribed?.targetRepsMin && prescribed.targetRepsMax
      ? `Objetivo ${prescribed.targetRepsMin}-${prescribed.targetRepsMax} reps`
      : prescribed?.targetReps
        ? `Objetivo ${prescribed.targetReps} reps`
        : null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={nextKey}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25 }}
        className="flex flex-1 flex-col justify-center gap-6 px-1 py-6"
      >
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            Ejercicio {exerciseIndex + 1} de {totalExercises} · Serie {rowIndex + 1} de{" "}
            {totalRowsForExercise}
          </p>
          <h2 className="mt-2 text-[32px] leading-tight font-semibold tracking-[-0.03em] text-foreground">
            {exercise.exercise.nameEs}
          </h2>
          {targetLabel ? <p className="mt-1 text-sm text-ink2">{targetLabel}</p> : null}
        </div>

        <div className="space-y-3">
          {exercise.exercise.tracksWeight ? (
            <FocusStepper
              label="Peso"
              value={weightKg}
              onChange={setWeightKg}
              step={incrementKg}
              min={0}
              max={500}
            />
          ) : null}
          {exercise.exercise.tracksReps ? (
            <FocusStepper
              label="Reps"
              value={reps}
              onChange={setReps}
              step={1}
              min={0}
              max={100}
            />
          ) : null}
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onComplete({ weightKg, reps, rpe: null, failed: false })}
            className="flex h-[132px] w-full flex-col items-center justify-center gap-1 rounded-[26px] bg-primary text-primary-foreground shadow-[0_14px_34px_-14px_var(--primary)]"
          >
            <span className="text-2xl font-semibold">Serie hecha</span>
            <span className="text-sm font-medium opacity-75">
              {weightKg ?? "–"} kg × {reps ?? "–"}
            </span>
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onSkip}
              className="flex-1 rounded-2xl bg-muted py-4 text-[15px] font-medium text-ink2"
            >
              Saltar
            </button>
            <button
              type="button"
              onClick={() => onComplete({ weightKg, reps, rpe: null, failed: true })}
              className="flex-1 rounded-2xl bg-muted py-4 text-[15px] font-medium text-ink2"
            >
              Fallé
            </button>
          </div>
        </div>

        {lastTime ? (
          <p className="text-center text-[13px] text-muted-foreground">
            Anterior: {lastTime.weightKg ?? "–"} kg × {lastTime.reps ?? "–"}
          </p>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
