"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Play, X } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExerciseRow } from "./exercise-row";
import { ExercisePicker } from "./exercise-picker";
import { estimateSessionMinutes } from "@/lib/duration-estimate";
import { addExerciseToDay, removeDay, reorderExercises } from "@/server/actions/routines";
import { startWorkoutAction } from "@/server/actions/workout";
import { cn } from "@/lib/utils";
import type { RoutineDayWithDetails } from "@/server/db/routines";
import type { Exercise } from "@/db/schema";

export function DayCard({
  day,
  expanded,
  onToggleExpanded,
  onDayRemoved,
}: {
  day: RoutineDayWithDetails;
  expanded: boolean;
  onToggleExpanded: () => void;
  onDayRemoved: () => void;
}) {
  const router = useRouter();
  const [exercises, setExercises] = useState(day.exercises);
  const [pickerOpen, setPickerOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  const minutes = estimateSessionMinutes(
    exercises.map((e) => ({ tempo: e.tempo, restSeconds: e.restSeconds, sets: e.sets })),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setExercises((prev) => {
      const oldIndex = prev.findIndex((e) => e.id === active.id);
      const newIndex = prev.findIndex((e) => e.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      void reorderExercises(
        day.id,
        next.map((e) => e.id),
      );
      return next;
    });
  }

  async function handleConfirmExercises(exercises: Exercise[]) {
    for (const exercise of exercises) {
      await addExerciseToDay(day.id, exercise.id);
    }
    router.refresh();
  }

  async function handleRemoveDay() {
    await removeDay(day.id);
    onDayRemoved();
  }

  return (
    <Card className="gap-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left active:scale-[0.99]"
        >
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground">{day.name}</h3>
            <p className="text-xs tabular-nums text-muted-foreground">
              {exercises.length} ejercicios · ~{minutes} min
            </p>
          </div>
          <ChevronDown
            className={cn(
              "size-5 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {exercises.length > 0 ? (
            <form action={startWorkoutAction.bind(null, day.id)}>
              <Button type="submit" size="touch">
                <Play className="size-4" /> Empezar
              </Button>
            </form>
          ) : null}
          <Button
            type="button"
            size="icon-touch"
            variant="ghost"
            aria-label="Eliminar día"
            onClick={handleRemoveDay}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {expanded ? (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={exercises.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {exercises.map((exercise) => (
                  <ExerciseRow
                    key={exercise.id}
                    routineExercise={exercise}
                    onRemoved={() =>
                      setExercises((prev) => prev.filter((e) => e.id !== exercise.id))
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button
            type="button"
            variant="outline"
            size="touch"
            className="w-full"
            onClick={() => setPickerOpen(true)}
          >
            + Agregar ejercicio
          </Button>
        </>
      ) : null}

      <ExercisePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onConfirm={handleConfirmExercises}
      />
    </Card>
  );
}
