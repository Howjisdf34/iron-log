"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SortableItem } from "./sortable-item";
import { SetsEditor } from "./sets-editor";
import { removeExerciseFromDay, updateRoutineExercise } from "@/server/actions/routines";
import type { RoutineExerciseWithDetails } from "@/server/db/routines";

export function ExerciseRow({
  routineExercise,
  onRemoved,
}: {
  routineExercise: RoutineExerciseWithDetails;
  onRemoved: () => void;
}) {
  const [restSeconds, setRestSeconds] = useState(routineExercise.restSeconds ?? 90);
  const [tempo, setTempo] = useState(routineExercise.tempo ?? "");
  const [supersetGroup, setSupersetGroup] = useState(
    routineExercise.supersetGroup?.toString() ?? "",
  );

  async function saveMeta() {
    await updateRoutineExercise({
      routineExerciseId: routineExercise.id,
      restSeconds,
      tempo: tempo || null,
      supersetGroup: supersetGroup ? Number(supersetGroup) : null,
    });
  }

  async function remove() {
    await removeExerciseFromDay(routineExercise.id);
    onRemoved();
  }

  return (
    <SortableItem id={routineExercise.id}>
      <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-foreground">{routineExercise.exercise.nameEs}</p>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Quitar ejercicio"
            onClick={remove}
          >
            <X className="size-4" />
          </Button>
        </div>

        <SetsEditor routineExercise={routineExercise} />

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label htmlFor={`rest-${routineExercise.id}`} className="text-xs">
              Descanso (s)
            </Label>
            <Input
              id={`rest-${routineExercise.id}`}
              type="number"
              min={0}
              max={900}
              value={restSeconds}
              onChange={(e) => setRestSeconds(Number(e.target.value))}
              onBlur={saveMeta}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`tempo-${routineExercise.id}`} className="text-xs">
              Tempo
            </Label>
            <Input
              id={`tempo-${routineExercise.id}`}
              placeholder="2-0-2-0"
              value={tempo}
              onChange={(e) => setTempo(e.target.value)}
              onBlur={saveMeta}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`superset-${routineExercise.id}`} className="text-xs">
              Superserie #
            </Label>
            <Input
              id={`superset-${routineExercise.id}`}
              type="number"
              min={0}
              placeholder="—"
              value={supersetGroup}
              onChange={(e) => setSupersetGroup(e.target.value)}
              onBlur={saveMeta}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>
    </SortableItem>
  );
}
