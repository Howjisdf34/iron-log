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
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background px-6"
          aria-live="polite"
        >
          <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Descanso
          </p>

          <div className="relative flex size-56 shrink-0 items-center justify-center">
            <svg viewBox="0 0 120 120" className="absolute inset-0 size-56 -rotate-90">
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                strokeWidth="6"
                className="fill-none stroke-muted"
              />
              <motion.circle
                cx="60"
                cy="60"
                r={RADIUS}
                strokeWidth="6"
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
              className="text-[64px] leading-none font-semibold tracking-[-0.05em] tabular-nums text-foreground sm:text-[96px]"
              animate={isLastMoments ? { scale: [1, 1.15, 1] } : { scale: 1 }}
              transition={
                isLastMoments ? { duration: 1, repeat: Infinity } : springs.snappy
              }
            >
              {minutes}:{seconds.toString().padStart(2, "0")}
            </motion.div>
          </div>

          {restLabel ? (
            <p className="max-w-xs truncate text-[15px] text-ink2">{restLabel}</p>
          ) : null}

          <div className="mt-2 flex w-full max-w-xs flex-col items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl px-6 py-4 text-base"
              onClick={() => adjustRest(30_000)}
            >
              +30 s
            </Button>
            <Button
              type="button"
              size="touch"
              className="w-full rounded-2xl py-5 text-base"
              onClick={clearRest}
            >
              Saltar descanso
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
