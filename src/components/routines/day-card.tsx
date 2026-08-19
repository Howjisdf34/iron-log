"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
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
import { ExerciseRow } from "./exercise-row";
import { ExercisePicker } from "./exercise-picker";
import { estimateSessionMinutes } from "@/lib/duration-estimate";
import { addExerciseToDay, removeDay, reorderExercises } from "@/server/actions/routines";
import type { RoutineDayWithDetails } from "@/server/db/routines";
import type { Exercise } from "@/db/schema";

export function DayCard({
  day,
  onDayRemoved,
}: {
  day: RoutineDayWithDetails;
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

  async function handleSelectExercise(exercise: Exercise) {
    await addExerciseToDay(day.id, exercise.id);
    router.refresh();
  }

  async function handleRemoveDay() {
    await removeDay(day.id);
    onDayRemoved();
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{day.name}</h3>
          <p className="text-xs tabular-nums text-muted-foreground">
            {exercises.length} ejercicios · ~{minutes} min
          </p>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Eliminar día"
          onClick={handleRemoveDay}
        >
          <X className="size-4" />
        </Button>
      </div>

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
        size="sm"
        onClick={() => setPickerOpen(true)}
      >
        + Agregar ejercicio
      </Button>

      <ExercisePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleSelectExercise}
      />
    </div>
  );
}
