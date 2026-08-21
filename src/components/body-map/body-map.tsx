"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BACK_REGIONS,
  BODY_OUTLINE_PATH,
  FRONT_REGIONS,
  type MuscleRegion,
} from "./regions";

interface BodyMapProps {
  selectedMuscle?: string | null;
  onSelectMuscle: (slug: string | null) => void;
  className?: string;
}

/**
 * Mapa muscular tappable — esquemático (silueta simple + óvalos), no
 * anatómico detallado. Toggle front/back porque no hay espacio para
 * mostrar ambos vistas grandes en una pantalla de celular a la vez.
 */
export function BodyMap({ selectedMuscle, onSelectMuscle, className }: BodyMapProps) {
  const [view, setView] = useState<"front" | "back">("front");
  const regions = view === "front" ? FRONT_REGIONS : BACK_REGIONS;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={view === "front" ? "default" : "outline"}
          onClick={() => setView("front")}
        >
          Frente
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "back" ? "default" : "outline"}
          onClick={() => setView("back")}
        >
          Espalda
        </Button>
      </div>

      <svg
        viewBox="0 0 200 400"
        className="h-96 w-48 touch-manipulation"
        role="group"
        aria-label={`Mapa muscular, vista ${view === "front" ? "frontal" : "posterior"}`}
      >
        <path
          d={BODY_OUTLINE_PATH}
          className="fill-muted stroke-border"
          strokeWidth={1.5}
          fillRule="nonzero"
        />
        {regions.map((region, i) => (
          <RegionShape
            key={`${region.slug}-${i}`}
            region={region}
            isSelected={selectedMuscle === region.slug}
            onSelect={() =>
              onSelectMuscle(selectedMuscle === region.slug ? null : region.slug)
            }
          />
        ))}
      </svg>

      {selectedMuscle ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onSelectMuscle(null)}
        >
          Quitar filtro de músculo
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">Tocá un músculo para filtrar</p>
      )}
    </div>
  );
}

function RegionShape({
  region,
  isSelected,
  onSelect,
}: {
  region: MuscleRegion;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <ellipse
      cx={region.cx}
      cy={region.cy}
      rx={region.rx}
      ry={region.ry}
      role="button"
      tabIndex={0}
      aria-label={region.label}
      aria-pressed={isSelected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "cursor-pointer stroke-background/50 transition-colors focus-visible:outline-2 focus-visible:outline-ring",
        isSelected ? "fill-primary" : "fill-muted-foreground/40 hover:fill-primary/60",
      )}
      strokeWidth={1}
    >
      <title>{region.label}</title>
    </ellipse>
  );
}
