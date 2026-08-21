"use client";

import { useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StepperProps {
  value: number | null;
  onChange: (value: number | null) => void;
  step: number;
  suffix?: string;
  min?: number;
  max?: number;
  ariaLabel: string;
  /** Etiqueta chica arriba del valor ("kg", "reps", "RPE") — sin esto no hay
   * forma de saber qué stepper es cuál salvo por el sufijo del peso. */
  label?: string;
}

/**
 * Steppers +/- grandes (≥48px, CLAUDE.md §5.3). Sin teclado numérico por
 * defecto — sólo aparece si haces long-press en el número.
 */
export function Stepper({
  value,
  onChange,
  step,
  suffix = "",
  min = 0,
  max = 999,
  ariaLabel,
  label,
}: StepperProps) {
  const [editing, setEditing] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clamp(n: number): number {
    return Math.min(max, Math.max(min, n));
  }

  function startPress() {
    pressTimer.current = setTimeout(() => setEditing(true), 500);
  }
  function endPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }

  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      {label ? (
        <span className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
      ) : null}
      {editing ? (
        <Input
          type="number"
          autoFocus
          inputMode="decimal"
          aria-label={ariaLabel}
          className="h-12 w-full max-w-20 text-center text-base"
          defaultValue={value ?? ""}
          onBlur={(e) => {
            const n = Number(e.target.value);
            onChange(Number.isFinite(n) && e.target.value !== "" ? clamp(n) : null);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      ) : (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon-touch"
            variant="outline"
            onClick={() => onChange(clamp((value ?? 0) - step))}
            aria-label={`Restar ${ariaLabel}`}
          >
            <Minus className="size-4" />
          </Button>
          <span
            role="button"
            tabIndex={0}
            onPointerDown={startPress}
            onPointerUp={endPress}
            onPointerLeave={endPress}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setEditing(true);
              }
            }}
            aria-label={`${ariaLabel}, mantén presionado para escribir`}
            className="min-w-9 select-none rounded-lg px-0.5 text-center text-base font-semibold tabular-nums text-foreground"
          >
            {value ?? "–"}
            {suffix}
          </span>
          <Button
            type="button"
            size="icon-touch"
            variant="outline"
            onClick={() => onChange(clamp((value ?? 0) + step))}
            aria-label={`Sumar ${ariaLabel}`}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
