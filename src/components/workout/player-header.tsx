"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNow } from "@/lib/hooks/use-now";

interface PlayerHeaderProps {
  dayName: string | null;
  startedAt: string;
  completedSets: number;
  totalSets: number;
  onExit: () => void;
  onFinish: () => void;
  isFinishing: boolean;
  canFinish: boolean;
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
  startedAt,
  completedSets,
  totalSets,
  onExit,
  onFinish,
  isFinishing,
  canFinish,
}: PlayerHeaderProps) {
  const now = useNow(1000, true);
  const elapsedMs = now - new Date(startedAt).getTime();
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const progress = totalSets > 0 ? completedSets / totalSets : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between gap-2 px-2 py-2.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-touch"
          onClick={() => setConfirmExit(true)}
          aria-label="Salir del entrenamiento"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col items-center">
          <p className="max-w-full truncate text-xs text-muted-foreground">
            {dayName ?? "Entrenamiento libre"}
          </p>
          <p className="text-[19px] font-semibold tracking-[-0.02em] tabular-nums text-foreground">
            {formatElapsed(elapsedMs)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmFinish(true)}
          disabled={!canFinish || isFinishing}
          className="shrink-0 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
        >
          {isFinishing ? "Guardando…" : "Terminar"}
        </button>
      </div>

      <div className="h-0.5 bg-border">
        <motion.div
          className="h-full origin-left bg-primary"
          initial={false}
          animate={{ scaleX: Math.min(1, progress) }}
          transition={{ duration: 0.3, ease: "linear" }}
          style={{ transformOrigin: "left" }}
        />
      </div>

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

      <Dialog open={confirmFinish} onOpenChange={setConfirmFinish}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Terminar entrenamiento?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Registraste {completedSets} de {totalSets} series. Podés seguir entrenando o
            cerrar la sesión ahora.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="touch"
              className="flex-1"
              onClick={() => setConfirmFinish(false)}
            >
              Seguir
            </Button>
            <Button
              type="button"
              size="touch"
              className="flex-1"
              onClick={() => {
                setConfirmFinish(false);
                onFinish();
              }}
            >
              <Sparkles className="size-4" /> Terminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
