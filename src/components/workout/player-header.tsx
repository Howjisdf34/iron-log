"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNow } from "@/lib/hooks/use-now";
import { springs } from "@/lib/motion/springs";

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

function ExerciseProgressBar({
  total,
  currentIndex,
}: {
  total: number;
  currentIndex: number;
}) {
  if (total === 0) return null;
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={currentIndex + 1}
      aria-label="Progreso del entrenamiento"
      className="flex gap-1 px-2 pb-2"
    >
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full origin-left rounded-full bg-primary"
            initial={false}
            animate={{ scaleX: i <= currentIndex ? 1 : 0 }}
            transition={springs.smooth}
          />
        </div>
      ))}
    </div>
  );
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
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-2 py-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-touch"
          onClick={() => setConfirmExit(true)}
          aria-label="Salir del entrenamiento"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-foreground">
          {dayName ?? "Entrenamiento libre"}
        </p>
        <span className="w-16 shrink-0 text-right text-sm font-semibold text-foreground tabular-nums">
          {formatElapsed(elapsedMs)}
        </span>
      </div>
      <ExerciseProgressBar total={total} currentIndex={currentIndex} />

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
