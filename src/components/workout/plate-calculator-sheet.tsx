"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { calculatePlateBreakdown } from "@/lib/plate-calculator";
import type { PlateInventory } from "@/db/schema";

interface PlateCalculatorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetWeightKg: number | null;
  inventory: PlateInventory;
}

/** Tap en el peso → discos a poner por lado (CLAUDE.md §5.3). */
export function PlateCalculatorSheet({
  open,
  onOpenChange,
  targetWeightKg,
  inventory,
}: PlateCalculatorSheetProps) {
  if (targetWeightKg == null) return null;

  const breakdown = calculatePlateBreakdown(targetWeightKg, {
    barWeightKg: Number(inventory.barWeightKg),
    platesAvailable: inventory.platesAvailable,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>{targetWeightKg} kg</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Barra {Number(inventory.barWeightKg)}kg + esto de cada lado:
          </p>
          {breakdown.perSide.length === 0 ? (
            <p className="text-foreground">Sólo la barra, sin discos.</p>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              {breakdown.perSide.flatMap((p) =>
                Array.from({ length: p.count }).map((_, i) => (
                  <div
                    key={`${p.plateKg}-${i}`}
                    className="flex items-center justify-center rounded bg-primary font-bold text-primary-foreground tabular-nums"
                    style={{ width: 26 + p.plateKg, height: 56 + p.plateKg }}
                  >
                    {p.plateKg}
                  </div>
                )),
              )}
            </div>
          )}
          {!breakdown.exact ? (
            <p className="text-sm text-destructive">
              No se llega exacto con tu inventario — quedaría en{" "}
              {breakdown.totalWeightKg.toFixed(1)}kg.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
