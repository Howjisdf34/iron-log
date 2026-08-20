"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SortableItem } from "@/components/routines/sortable-item";
import { DayCard } from "@/components/routines/day-card";
import { DownloadOfflineButton } from "@/components/routines/download-offline-button";
import { estimateSessionMinutes } from "@/lib/duration-estimate";
import { addDay, reorderDays } from "@/server/actions/routines";
import type { RoutineWithDetails } from "@/server/db/routines";

const GOAL_LABEL: Record<string, string> = {
  strength: "Fuerza",
  hypertrophy: "Hipertrofia",
  endurance: "Resistencia",
  recomp: "Recomposición",
};

export function RoutineEditorClient({ routine }: { routine: RoutineWithDetails }) {
  const router = useRouter();
  const [days, setDays] = useState(routine.days);
  // `routine` es un objeto nuevo en cada refresh del server (router.refresh()
  // desde DayCard al agregar/quitar un ejercicio) — sin esto, `days` queda
  // pisado con datos viejos porque useState sólo lee el valor inicial. Este
  // componente no remonta en ese caso (el key de page.tsx sólo cambia si se
  // agrega/quita un DÍA, no un ejercicio) — bug real: los ejercicios se
  // guardaban en la DB pero no aparecían en pantalla hasta recargar.
  const [prevRoutine, setPrevRoutine] = useState(routine);
  if (routine !== prevRoutine) {
    setPrevRoutine(routine);
    setDays(routine.days);
  }

  // Vive acá (no dentro de DayCard) para sobrevivir a que un día remonte al
  // agregarle/quitarle un ejercicio (ver comment del key más abajo) — si no,
  // el día se cierra solo apenas agregás el primer ejercicio. Un día recién
  // creado (sin ejercicios) arranca abierto.
  const [expandedDayIds, setExpandedDayIds] = useState(
    () => new Set(routine.days.filter((d) => d.exercises.length === 0).map((d) => d.id)),
  );
  function toggleDayExpanded(dayId: string) {
    setExpandedDayIds((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId);
      else next.add(dayId);
      return next;
    });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  const totalMinutes = days.reduce(
    (sum, day) =>
      sum +
      estimateSessionMinutes(
        day.exercises.map((e) => ({
          tempo: e.tempo,
          restSeconds: e.restSeconds,
          sets: e.sets,
        })),
      ),
    0,
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDays((prev) => {
      const oldIndex = prev.findIndex((d) => d.id === active.id);
      const newIndex = prev.findIndex((d) => d.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      void reorderDays(
        routine.id,
        next.map((d) => d.id),
      );
      return next;
    });
  }

  async function handleAddDay() {
    await addDay(routine.id);
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6 pb-24">
      <div>
        <Link
          href="/rutinas"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="size-4" /> Rutinas
        </Link>
      </div>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{routine.name}</h1>
        {routine.description ? (
          <p className="text-sm text-muted-foreground">{routine.description}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{GOAL_LABEL[routine.goal] ?? routine.goal}</Badge>
          <Badge variant="outline">{routine.daysPerWeek} días/semana</Badge>
          <Badge variant="outline" className="tabular-nums">
            ~{totalMinutes} min total
          </Badge>
        </div>
        <DownloadOfflineButton routine={routine} />
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={days.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {days.map((day) => (
              <SortableItem
                // Incluye los ids de ejercicios en la key: cuando el
                // server refresca (agregar/quitar día), fuerza un remount
                // de DayCard que reinicializa su estado local sin useEffect.
                key={`${day.id}:${day.exercises.map((e) => e.id).join(",")}`}
                id={day.id}
              >
                <DayCard
                  day={day}
                  expanded={expandedDayIds.has(day.id)}
                  onToggleExpanded={() => toggleDayExpanded(day.id)}
                  onDayRemoved={() =>
                    setDays((prev) => prev.filter((d) => d.id !== day.id))
                  }
                />
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button type="button" variant="outline" size="touch" onClick={handleAddDay}>
        + Agregar día
      </Button>
    </main>
  );
}
