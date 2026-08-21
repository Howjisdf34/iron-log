"use client";

import { useState } from "react";
import { calculatePlateBreakdown, PLATE_COLOR } from "@/lib/plate-calculator";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PlateInventory } from "@/db/schema";

export function DiscosClient({ inventory }: { inventory: PlateInventory }) {
  const [weight, setWeight] = useState(60);

  const breakdown = calculatePlateBreakdown(weight, {
    barWeightKg: Number(inventory.barWeightKg),
    platesAvailable: inventory.platesAvailable,
  });

  return (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="target-weight"
          className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase"
        >
          Peso objetivo (kg)
        </label>
        <Input
          id="target-weight"
          type="number"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value) || 0)}
          className="mt-1.5 h-12 text-base"
        />
      </div>

      <div>
        <p className="text-sm text-muted-foreground">
          Barra {Number(inventory.barWeightKg)}kg + esto de cada lado:
        </p>
        {breakdown.perSide.length === 0 ? (
          <p className="mt-2 text-foreground">Sólo la barra, sin discos.</p>
        ) : (
          <div className="mt-3 flex flex-wrap items-end gap-3 py-2">
            {breakdown.perSide.flatMap((p) =>
              Array.from({ length: p.count }).map((_, i) => (
                <div
                  key={`${p.plateKg}-${i}`}
                  className={cn(
                    "flex items-center justify-center rounded-md font-bold tabular-nums",
                    PLATE_COLOR[p.plateKg] ?? "bg-primary text-primary-foreground",
                  )}
                  style={{ width: 30 + p.plateKg, height: 64 + p.plateKg }}
                >
                  {p.plateKg}
                </div>
              )),
            )}
          </div>
        )}
        {!breakdown.exact ? (
          <p className="mt-2 text-sm text-destructive">
            No se llega exacto con tu inventario — quedaría en{" "}
            {breakdown.totalWeightKg.toFixed(1)}kg.
          </p>
        ) : null}
      </div>
    </div>
  );
}
