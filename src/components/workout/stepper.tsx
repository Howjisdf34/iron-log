"use client";

import { useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface StepperProps {
  value: number | null;
  onChange: (value: number | null) => void;
  step: number;
  suffix?: string;
  min?: number;
  max?: number;
  ariaLabel: string;
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

  if (editing) {
    return (
      <Input
        type="number"
        autoFocus
        inputMode="decimal"
        aria-label={ariaLabel}
        className="h-12 w-16 shrink-0 text-center text-base"
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
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
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
        className={cn(
          "min-w-11 select-none rounded-lg px-1 text-center text-base font-semibold tabular-nums text-foreground",
        )}
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
  );
}
