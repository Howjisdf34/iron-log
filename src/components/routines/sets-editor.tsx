"use client";

import { useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateExerciseSets } from "@/server/actions/routines";
import type { RoutineSetInput } from "@/lib/validation/routines";
import type { RoutineExerciseWithDetails } from "@/server/db/routines";

const SET_TYPE_LABEL: Record<string, string> = {
  warmup: "Calentamiento",
  working: "Trabajo",
  drop: "Drop set",
  failure: "Al fallo",
  amrap: "AMRAP",
  backoff: "Backoff",
};

function toInput(sets: RoutineExerciseWithDetails["sets"]): RoutineSetInput[] {
  return sets.map((s) => ({
    setType: s.setType,
    targetReps: s.targetReps,
    targetRepsMin: s.targetRepsMin,
    targetRepsMax: s.targetRepsMax,
    targetRpe: s.targetRpe ? Number(s.targetRpe) : null,
    restSecondsOverride: s.restSecondsOverride,
  }));
}

export function SetsEditor({
  routineExercise,
}: {
  routineExercise: RoutineExerciseWithDetails;
}) {
  const [sets, setSets] = useState<RoutineSetInput[]>(() =>
    toInput(routineExercise.sets),
  );
  const [saved, setSaved] = useState<RoutineSetInput[]>(sets);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = JSON.stringify(sets) !== JSON.stringify(saved);

  function updateSet(index: number, patch: Partial<RoutineSetInput>) {
    setSets((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSet() {
    const last = sets.at(-1);
    setSets((prev) => [
      ...prev,
      last ? { ...last } : { setType: "working", targetReps: 10 },
    ]);
  }

  function removeSet(index: number) {
    setSets((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    setIsSaving(true);
    try {
      await updateExerciseSets(routineExercise.id, sets);
      setSaved(sets);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      {sets.map((set, index) => (
        <div
          key={index}
          className="flex flex-wrap items-center gap-2 rounded-lg bg-muted p-2"
        >
          <Select
            value={set.setType}
            onValueChange={(v) =>
              updateSet(index, { setType: v as RoutineSetInput["setType"] })
            }
          >
            <SelectTrigger className="h-9 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SET_TYPE_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label="Menos reps"
              onClick={() =>
                updateSet(index, { targetReps: Math.max(1, (set.targetReps ?? 10) - 1) })
              }
            >
              <Minus className="size-3" />
            </Button>
            <span className="w-10 text-center text-sm tabular-nums text-foreground">
              {set.targetReps ?? "-"}
            </span>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label="Más reps"
              onClick={() => updateSet(index, { targetReps: (set.targetReps ?? 9) + 1 })}
            >
              <Plus className="size-3" />
            </Button>
            <span className="text-xs text-muted-foreground">reps</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label="Menos RPE"
              onClick={() =>
                updateSet(index, { targetRpe: Math.max(1, (set.targetRpe ?? 8) - 0.5) })
              }
            >
              <Minus className="size-3" />
            </Button>
            <span className="w-10 text-center text-sm tabular-nums text-foreground">
              {set.targetRpe ?? "-"}
            </span>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label="Más RPE"
              onClick={() =>
                updateSet(index, { targetRpe: Math.min(10, (set.targetRpe ?? 7) + 0.5) })
              }
            >
              <Plus className="size-3" />
            </Button>
            <span className="text-xs text-muted-foreground">RPE</span>
          </div>

          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Quitar serie"
            className="ml-auto"
            onClick={() => removeSet(index)}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={addSet}>
          + Serie
        </Button>
        {isDirty ? (
          <Button type="button" size="sm" onClick={save} disabled={isSaving}>
            {isSaving ? "Guardando…" : "Guardar series"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
