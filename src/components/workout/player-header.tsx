"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNow } from "@/lib/hooks/use-now";

interface PlayerHeaderProps {
  dayName: string | null;
  currentIndex: number;
  total: number;
  startedAt: string;
  onExit: () => void;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function PlayerHeader({
  dayName,
  currentIndex,
  total,
  startedAt,
  onExit,
}: PlayerHeaderProps) {
  const now = useNow(1000, true);
  const elapsedMs = now - new Date(startedAt).getTime();
  const [confirmExit, setConfirmExit] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-2 py-3 backdrop-blur">
      <Button
        type="button"
        variant="ghost"
        size="icon-touch"
        onClick={() => setConfirmExit(true)}
        aria-label="Salir del entrenamiento"
      >
        <ChevronLeft className="size-5" />
      </Button>
      <div className="min-w-0 flex-1 text-center">
        <p className="truncate text-sm font-semibold text-foreground">
          {dayName ?? "Entrenamiento libre"}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {currentIndex + 1}/{total} ejercicios
        </p>
      </div>
      <span className="w-16 shrink-0 text-right text-sm font-semibold text-foreground tabular-nums">
        {formatElapsed(elapsedMs)}
      </span>

      <Dialog open={confirmExit} onOpenChange={setConfirmExit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Salir del entrenamiento?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Las series que ya registraste quedan guardadas. El entrenamiento se marca como
            abandonado.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="touch"
              className="flex-1"
              onClick={() => setConfirmExit(false)}
            >
              Seguir
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="touch"
              className="flex-1"
              onClick={onExit}
            >
              Salir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
