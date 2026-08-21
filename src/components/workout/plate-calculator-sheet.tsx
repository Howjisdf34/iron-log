"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { calculatePlateBreakdown } from "@/lib/plate-calculator";
import { cn } from "@/lib/utils";
import type { PlateInventory } from "@/db/schema";

interface PlateCalculatorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetWeightKg: number | null;
  inventory: PlateInventory;
}

// Colores estándar de disco olímpico (IWF) por kg — ayuda a reconocer el
// disco de un vistazo real, no sólo decoración. Pesos fuera de esta tabla
// (microplacas custom, etc.) caen al acento de la app.
const PLATE_COLOR: Record<number, string> = {
  25: "bg-red-600 text-white",
  20: "bg-blue-600 text-white",
  15: "bg-yellow-500 text-black",
  10: "bg-green-600 text-white",
  5: "border border-border bg-white text-black",
  2.5: "bg-neutral-900 text-white",
  1.25: "border border-border bg-zinc-300 text-black",
  1: "bg-neutral-700 text-white",
  0.5: "border border-border bg-zinc-400 text-black",
};

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
      <DialogContent className="top-auto bottom-0 left-0 w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl tabular-nums">{targetWeightKg} kg</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pb-2">
          <p className="text-sm text-muted-foreground">
            Barra {Number(inventory.barWeightKg)}kg + esto de cada lado:
          </p>
          {breakdown.perSide.length === 0 ? (
            <p className="text-foreground">Sólo la barra, sin discos.</p>
          ) : (
            <div className="flex flex-wrap items-end gap-3 py-2">
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
