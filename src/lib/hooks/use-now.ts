"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Lee `Date.now()` de forma reactiva sin violar las reglas de pureza de
 * render (Date.now es impuro — el linter de React lo prohíbe fuera de
 * `useSyncExternalStore`, que es exactamente el escape hatch pensado para
 * leer una fuente de verdad externa/mutable como el reloj). Se resuscribe
 * cada `intervalMs` y en cada `visibilitychange`, para que timers basados
 * en timestamp absoluto (ver ADR-012) se recalculen bien al volver de
 * background.
 */
export function useNow(intervalMs: number, active: boolean): number {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (!active) return () => {};
      const id = setInterval(callback, intervalMs);
      const onVisible = () => {
        if (document.visibilityState === "visible") callback();
      };
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        clearInterval(id);
        document.removeEventListener("visibilitychange", onVisible);
      };
    },
    [intervalMs, active],
  );

  return useSyncExternalStore(
    subscribe,
    () => Date.now(),
    () => 0,
  );
}
