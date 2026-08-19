"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { useWorkoutStore } from "@/lib/stores/workout-store";
import { useNow } from "@/lib/hooks/use-now";
import { triggerHaptic } from "@/lib/haptics";
import { playRestEndSound } from "@/lib/sound";
import { notifyRestDone } from "@/lib/notifications";
import { springs } from "@/lib/motion/springs";

interface RestTimerProps {
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
}

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Basado en timestamp absoluto (`restEndsAt`), nunca en un contador de
 * `setInterval` — si bloqueás la pantalla o cambiás de app, al volver
 * muestra el tiempo correcto porque se RECALCULA, no se sigue restando
 * desde donde iba. `useTick` sólo fuerza el re-render. Ver ADR-012.
 */
export function RestTimer({ hapticsEnabled, soundsEnabled }: RestTimerProps) {
  const { restEndsAt, restDurationMs, restLabel, adjustRest, clearRest } =
    useWorkoutStore();
  const active = restEndsAt != null;
  const now = useNow(250, active);
  const firedRef = useRef(false);

  const remainingMs = active ? Math.max(0, restEndsAt - now) : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const totalSeconds = restDurationMs ? Math.round(restDurationMs / 1000) : 0;
  const progress = totalSeconds > 0 ? 1 - remainingMs / (totalSeconds * 1000) : 0;
  const isLastMoments = active && remainingSeconds <= 3 && remainingSeconds > 0;

  useEffect(() => {
    if (!active) {
      firedRef.current = false;
      return;
    }
    if (remainingMs <= 0 && !firedRef.current) {
      firedRef.current = true;
      triggerHaptic("restEnd", hapticsEnabled);
      playRestEndSound(soundsEnabled);
      notifyRestDone(restLabel);
    }
  }, [active, remainingMs, hapticsEnabled, soundsEnabled, restLabel]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={springs.smooth}
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-4 backdrop-blur"
          aria-live="polite"
        >
          <div className="mx-auto flex max-w-md items-center gap-4">
            <div className="relative size-24 shrink-0">
              <svg viewBox="0 0 120 120" className="size-24 -rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r={RADIUS}
                  strokeWidth="8"
                  className="fill-none stroke-muted"
                />
                <motion.circle
                  cx="60"
                  cy="60"
                  r={RADIUS}
                  strokeWidth="8"
                  strokeLinecap="round"
                  className={
                    isLastMoments
                      ? "fill-none stroke-destructive"
                      : "fill-none stroke-primary"
                  }
                  strokeDasharray={CIRCUMFERENCE}
                  animate={{
                    strokeDashoffset: CIRCUMFERENCE * (1 - Math.min(1, progress)),
                  }}
                  transition={{ duration: 0.25, ease: "linear" }}
                />
              </svg>
              <motion.div
                className="absolute inset-0 flex items-center justify-center text-xl font-bold tabular-nums text-foreground"
                animate={isLastMoments ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                transition={
                  isLastMoments ? { duration: 1, repeat: Infinity } : springs.snappy
                }
              >
                {minutes}:{seconds.toString().padStart(2, "0")}
              </motion.div>
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              {restLabel ? (
                <p className="truncate text-sm text-muted-foreground">{restLabel}</p>
              ) : null}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="touch"
                  onClick={() => adjustRest(-15_000)}
                >
                  −15s
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="touch"
                  onClick={() => adjustRest(15_000)}
                >
                  +15s
                </Button>
                <Button type="button" variant="ghost" size="touch" onClick={clearRest}>
                  Saltar
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
