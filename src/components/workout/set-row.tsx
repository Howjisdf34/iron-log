"use client";

import { useState } from "react";
import { motion, type PanInfo } from "motion/react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stepper } from "./stepper";
import { springs } from "@/lib/motion/springs";
import type { PlayerLoggedSet, PlayerPrescribedSet } from "@/server/workout/player-data";

const SET_TYPE_LABEL: Record<string, string> = {
  warmup: "Calent.",
  working: "Serie",
  drop: "Drop",
  failure: "Fallo",
  amrap: "AMRAP",
  backoff: "Backoff",
};

export interface SetRowValues {
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  failed: boolean;
}

interface SetRowProps {
  displayNumber: number;
  setType: string;
  prescribed?: PlayerPrescribedSet;
  lastTime?: PlayerLoggedSet;
  logged?: PlayerLoggedSet;
  incrementKg: number;
  tracksWeight: boolean;
  tracksReps: boolean;
  onComplete: (values: SetRowValues) => void;
  /** Series prescrita todavía no alcanzada — se muestra como vista previa, sin steppers. */
  locked?: boolean;
}

function clampReps(n: number): number {
  return Math.max(0, Math.min(200, Math.round(n)));
}
function clampRpe(n: number): number {
  return Math.max(1, Math.min(10, Math.round(n * 2) / 2));
}

const SWIPE_THRESHOLD = 80;

export function SetRow({
  displayNumber,
  setType,
  prescribed,
  lastTime,
  logged,
  incrementKg,
  tracksWeight,
  tracksReps,
  onComplete,
  locked = false,
}: SetRowProps) {
  const [weightKg, setWeightKg] = useState<number | null>(
    prescribed?.targetWeightKg ?? lastTime?.weightKg ?? null,
  );
  const [reps, setReps] = useState<number | null>(
    prescribed?.targetReps ?? prescribed?.targetRepsMax ?? lastTime?.reps ?? null,
  );
  const [rpe, setRpe] = useState<number | null>(
    prescribed?.targetRpe ?? lastTime?.rpe ?? null,
  );

  const isDone = !!logged && !logged.failed;
  const isFailed = !!logged && logged.failed;
  const isSettled = isDone || isFailed;

  function handleComplete() {
    onComplete({ weightKg, reps, rpe, failed: false });
  }
  function handleFail() {
    onComplete({ weightKg, reps, rpe, failed: true });
  }

  function handleDragEnd(_event: unknown, info: PanInfo) {
    if (info.offset.x > SWIPE_THRESHOLD) handleComplete();
    else if (info.offset.x < -SWIPE_THRESHOLD) handleFail();
  }

  const improvedVsLastTime =
    isDone &&
    lastTime?.weightKg != null &&
    lastTime.reps != null &&
    logged?.weightKg != null &&
    logged.reps != null &&
    logged.weightKg * logged.reps > lastTime.weightKg * lastTime.reps;

  return (
    <motion.div
      layout
      drag={isSettled || locked ? false : "x"}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      initial={false}
      animate={{
        backgroundColor: isDone
          ? "color-mix(in oklch, var(--success), transparent 78%)"
          : isFailed
            ? "color-mix(in oklch, var(--destructive), transparent 82%)"
            : "var(--card)",
        opacity: locked ? 0.5 : 1,
      }}
      transition={springs.smooth}
      className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 px-3 py-2"
    >
      <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">
        {displayNumber}
      </span>
      <Badge variant="outline" className="shrink-0">
        {SET_TYPE_LABEL[setType] ?? setType}
      </Badge>

      {locked ? (
        <span className="flex-1 text-sm tabular-nums text-muted-foreground">
          {prescribed?.targetRepsMin && prescribed.targetRepsMax
            ? `${prescribed.targetRepsMin}-${prescribed.targetRepsMax} reps`
            : prescribed?.targetReps
              ? `${prescribed.targetReps} reps`
              : "—"}
          {prescribed?.targetWeightKg ? ` @ ${prescribed.targetWeightKg}kg` : ""}
          {prescribed?.targetRpe ? ` · RPE ${prescribed.targetRpe}` : ""}
        </span>
      ) : isSettled ? (
        <div className="flex flex-1 items-center justify-between gap-2 text-foreground">
          <span className="tabular-nums">
            {tracksWeight && logged?.weightKg != null ? `${logged.weightKg} kg` : null}
            {tracksWeight && tracksReps && logged?.weightKg != null ? " × " : null}
            {tracksReps && logged?.reps != null ? `${logged.reps} reps` : null}
            {logged?.rpe != null ? ` · RPE ${logged.rpe}` : ""}
            {improvedVsLastTime ? " 📈" : ""}
          </span>
          {isFailed ? (
            <X className="size-4 shrink-0 text-destructive" />
          ) : (
            <Check className="size-4 shrink-0 text-success" />
          )}
        </div>
      ) : (
        <>
          {tracksWeight && (
            <Stepper
              value={weightKg}
              onChange={setWeightKg}
              step={incrementKg}
              suffix="kg"
              min={0}
              max={500}
              ariaLabel="peso"
            />
          )}
          {tracksReps && (
            <Stepper
              value={reps}
              onChange={(v) => setReps(v != null ? clampReps(v) : v)}
              step={1}
              min={0}
              max={100}
              ariaLabel="repeticiones"
            />
          )}
          <Stepper
            value={rpe}
            onChange={(v) => setRpe(v != null ? clampRpe(v) : v)}
            step={0.5}
            min={1}
            max={10}
            ariaLabel="RPE"
          />
          <Button
            type="button"
            size="icon-touch"
            className="ml-auto shrink-0 bg-success text-background hover:bg-success/80"
            onClick={handleComplete}
            aria-label="Completar serie"
          >
            <Check className="size-5" />
          </Button>
        </>
      )}
    </motion.div>
  );
}
