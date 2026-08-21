"use client";

import { useState } from "react";
import { motion, type PanInfo } from "motion/react";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NumericPadSheet } from "./numeric-pad-sheet";
import { springs } from "@/lib/motion/springs";
import { cn } from "@/lib/utils";
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
  tracksWeight: boolean;
  tracksReps: boolean;
  onComplete: (values: SetRowValues) => void;
  /** Undo de una serie ya registrada — sólo disponible online (CLAUDE.md §5.5). */
  onUndo?: () => void;
  /** Series prescrita todavía no alcanzada — se muestra como vista previa, sin celdas. */
  locked?: boolean;
}

type PadField = "weight" | "reps" | "rpe" | null;

function clampReps(n: number): number {
  return Math.max(0, Math.min(200, Math.round(n)));
}
function clampRpe(n: number): number {
  return Math.max(1, Math.min(10, Math.round(n * 2) / 2));
}

const SWIPE_THRESHOLD = 80;

function Cell({
  label,
  value,
  suffix,
  wide = true,
  onTap,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  wide?: boolean;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-muted py-3",
        wide ? "flex-1" : "w-16 shrink-0",
      )}
    >
      <span className="text-2xl leading-none font-semibold tabular-nums text-foreground">
        {value ?? "–"}
        {value != null && suffix ? (
          <span className="ml-0.5 text-xs font-normal text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </span>
      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
    </button>
  );
}

export function SetRow({
  displayNumber,
  setType,
  prescribed,
  lastTime,
  logged,
  tracksWeight,
  tracksReps,
  onComplete,
  onUndo,
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
  const [padField, setPadField] = useState<PadField>(null);

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
          ? "var(--success-soft)"
          : isFailed
            ? "color-mix(in oklch, var(--destructive), transparent 82%)"
            : "var(--card)",
        opacity: locked ? 0.5 : 1,
      }}
      transition={springs.smooth}
      className="flex items-center gap-2.5 rounded-[18px] border border-border/60 px-2.5 py-2"
    >
      <span className="w-4 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">
        {displayNumber}
      </span>

      {locked ? (
        <div className="flex flex-1 items-center gap-2">
          <Badge variant="outline">{SET_TYPE_LABEL[setType] ?? setType}</Badge>
          <span className="flex-1 text-sm tabular-nums text-muted-foreground">
            {prescribed?.targetRepsMin && prescribed.targetRepsMax
              ? `${prescribed.targetRepsMin}-${prescribed.targetRepsMax} reps`
              : prescribed?.targetReps
                ? `${prescribed.targetReps} reps`
                : "—"}
            {prescribed?.targetWeightKg ? ` @ ${prescribed.targetWeightKg}kg` : ""}
            {prescribed?.targetRpe ? ` · RPE ${prescribed.targetRpe}` : ""}
          </span>
        </div>
      ) : isSettled ? (
        <button
          type="button"
          onClick={onUndo}
          disabled={!onUndo}
          aria-label={onUndo ? "Deshacer serie" : undefined}
          className="flex flex-1 items-center justify-between gap-2 text-foreground"
        >
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
        </button>
      ) : (
        <>
          <div className="flex flex-1 items-center gap-2">
            {tracksWeight && (
              <Cell label="kg" value={weightKg} onTap={() => setPadField("weight")} />
            )}
            {tracksReps && (
              <Cell label="reps" value={reps} onTap={() => setPadField("reps")} />
            )}
            <Cell label="RPE" value={rpe} wide={false} onTap={() => setPadField("rpe")} />
          </div>
          <button
            type="button"
            onClick={handleComplete}
            aria-label="Completar serie"
            className="flex size-14 shrink-0 items-center justify-center rounded-[18px] bg-muted text-muted-foreground"
          >
            <Check className="size-[22px]" />
          </button>
        </>
      )}

      <NumericPadSheet
        open={padField === "weight"}
        onOpenChange={(open) => !open && setPadField(null)}
        context={`Peso · Serie ${displayNumber}`}
        value={weightKg}
        onChange={(v) => setWeightKg(v != null ? Math.max(0, Math.min(500, v)) : v)}
      />
      <NumericPadSheet
        open={padField === "reps"}
        onOpenChange={(open) => !open && setPadField(null)}
        context={`Reps · Serie ${displayNumber}`}
        value={reps}
        allowDecimal={false}
        onChange={(v) => setReps(v != null ? clampReps(v) : v)}
      />
      <NumericPadSheet
        open={padField === "rpe"}
        onOpenChange={(open) => !open && setPadField(null)}
        context={`RPE · Serie ${displayNumber}`}
        value={rpe}
        onChange={(v) => setRpe(v != null ? clampRpe(v) : v)}
      />
    </motion.div>
  );
}
