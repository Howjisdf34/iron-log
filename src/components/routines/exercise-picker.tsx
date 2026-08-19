"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BodyMap } from "@/components/body-map/body-map";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { searchExercisesAction, listFiltersAction } from "@/server/actions/exercises";
import type { Exercise } from "@/db/schema";

const CATEGORY_LABEL: Record<string, string> = {
  compound: "Compuesto",
  isolation: "Aislamiento",
  cardio: "Cardio",
  mobility: "Movilidad",
};
const LEVEL_LABEL: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  expert: "Avanzado",
};

interface ExercisePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: Exercise) => void;
}

export function ExercisePicker({ open, onOpenChange, onSelect }: ExercisePickerProps) {
  const [query, setQuery] = useState("");
  const [muscleSlug, setMuscleSlug] = useState<string | null>(null);
  const [equipmentSlug, setEquipmentSlug] = useState<string>("");
  const debouncedQuery = useDebouncedValue(query, 250);

  const filtersQuery = useQuery({
    queryKey: ["exercise-filters"],
    queryFn: () => listFiltersAction(),
    enabled: open,
  });

  const resultsQuery = useQuery({
    queryKey: ["exercises-search", debouncedQuery, muscleSlug, equipmentSlug],
    queryFn: () =>
      searchExercisesAction({
        query: debouncedQuery || undefined,
        muscleSlug: muscleSlug || undefined,
        equipmentSlug: equipmentSlug || undefined,
      }),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Agregar ejercicio</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Buscar por nombre..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 text-base"
          autoFocus
        />

        <div className="flex flex-wrap items-start gap-4">
          <BodyMap selectedMuscle={muscleSlug} onSelectMuscle={setMuscleSlug} />

          <div className="flex-1 space-y-2">
            <Select
              value={equipmentSlug || "all"}
              onValueChange={(v) => setEquipmentSlug(!v || v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Equipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cualquier equipo</SelectItem>
                {filtersQuery.data?.equipment.map((eq) => (
                  <SelectItem key={eq.id} value={eq.slug}>
                    {eq.nameEs}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {resultsQuery.isLoading ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Buscando…</p>
          ) : resultsQuery.data?.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Sin resultados con estos filtros.
            </p>
          ) : (
            resultsQuery.data?.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => {
                  onSelect(exercise);
                  onOpenChange(false);
                }}
                className="flex w-full min-h-12 items-center justify-between gap-2 rounded-xl border border-transparent px-3 py-2 text-left hover:border-border hover:bg-card"
              >
                <span className="text-foreground">{exercise.nameEs}</span>
                <span className="flex shrink-0 gap-1">
                  <Badge variant="secondary">{CATEGORY_LABEL[exercise.category]}</Badge>
                  {exercise.level ? (
                    <Badge variant="outline">{LEVEL_LABEL[exercise.level]}</Badge>
                  ) : null}
                </span>
              </button>
            ))
          )}
        </div>

        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
