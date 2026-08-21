"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dumbbell,
  HeartPulse,
  Move,
  Search,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
const CATEGORY_ICON: Record<string, LucideIcon> = {
  compound: Dumbbell,
  isolation: Target,
  cardio: HeartPulse,
  mobility: Move,
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
      <DialogContent className="top-auto bottom-0 left-0 flex max-h-[92vh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-4 rounded-b-none rounded-t-3xl">
        <DialogHeader>
          <DialogTitle>Agregar ejercicio</DialogTitle>
        </DialogHeader>

        <div className="relative shrink-0">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 pl-10 text-base"
            autoFocus
          />
        </div>

        <div className="shrink-0 space-y-3">
          <BodyMap
            selectedMuscle={muscleSlug}
            onSelectMuscle={setMuscleSlug}
            className="mx-auto"
          />
          <Select
            value={equipmentSlug || "all"}
            onValueChange={(v) => setEquipmentSlug(!v || v === "all" ? "" : v)}
            items={{
              all: "Cualquier equipo",
              ...Object.fromEntries(
                filtersQuery.data?.equipment.map((eq) => [eq.slug, eq.nameEs]) ?? [],
              ),
            }}
          >
            <SelectTrigger className="h-12 w-full text-base">
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

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {resultsQuery.isLoading ? (
            <div className="space-y-2" aria-label="Buscando ejercicios">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : resultsQuery.data?.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Sin resultados con estos filtros.
            </p>
          ) : (
            resultsQuery.data?.map((exercise) => {
              const CategoryIcon = CATEGORY_ICON[exercise.category] ?? Dumbbell;
              return (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => {
                    onSelect(exercise);
                    onOpenChange(false);
                  }}
                  className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-card active:scale-[0.99]"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <CategoryIcon className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {exercise.nameEs}
                    </p>
                    <span className="flex flex-wrap gap-1 pt-0.5">
                      <Badge variant="secondary">
                        {CATEGORY_LABEL[exercise.category]}
                      </Badge>
                      {exercise.level ? (
                        <Badge variant="outline">{LEVEL_LABEL[exercise.level]}</Badge>
                      ) : null}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
