"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { springs } from "@/lib/motion/springs";

interface PrToastProps {
  message: string | null;
  onDismiss: () => void;
}

const CONFETTI_COUNT = 12;
const CONFETTI_COLORS = ["var(--chart-2)", "var(--chart-4)", "var(--background)"];

/** Confetti contenido + toast — no exagerar, ~1.2s, no tapa la UI (CLAUDE.md §5.3). */
export function PrToast({ message, onDismiss }: PrToastProps) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onDismiss, 1200);
    return () => clearTimeout(id);
  }, [message, onDismiss]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={springs.bouncy}
          className="fixed inset-x-4 top-4 z-[60] mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 overflow-visible rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg"
        >
          <span className="pointer-events-none absolute inset-0 overflow-visible rounded-full">
            {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute top-1/2 left-1/2 size-1.5 rounded-full"
                style={{ backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }}
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{
                  x: Math.cos((i / CONFETTI_COUNT) * Math.PI * 2) * 56,
                  y: Math.sin((i / CONFETTI_COUNT) * Math.PI * 2) * 56,
                  opacity: 0,
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            ))}
          </span>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
