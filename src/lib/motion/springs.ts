import type { Transition } from "motion/react";

/**
 * Único punto de verdad para las curvas de movimiento de la app.
 * Nada de duraciones/easings sueltos en componentes — importa de aquí.
 * Ver docs/design-system.md#movimiento.
 */
export const springs = {
  /** Feedback inmediato: press states, checks de serie, toggles. */
  snappy: {
    type: "spring",
    stiffness: 500,
    damping: 30,
    mass: 0.8,
  },
  /** Transiciones de layout/página: shared elements, bottom sheets. */
  smooth: {
    type: "spring",
    stiffness: 300,
    damping: 32,
    mass: 1,
  },
  /** Momentos de celebración: PR toast, resumen final, confetti. */
  bouncy: {
    type: "spring",
    stiffness: 420,
    damping: 18,
    mass: 0.9,
  },
} as const satisfies Record<string, Transition>;

export type SpringName = keyof typeof springs;

/** Stagger para listas al montar (sólo primer render, ver useStaggerOnce). */
export const listStagger = {
  container: {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.05, delayChildren: 0.02 },
    },
  },
  item: {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: springs.smooth },
  },
} as const;
