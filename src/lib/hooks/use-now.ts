"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

/**
 * Lee `Date.now()` de forma reactiva sin violar las reglas de pureza de
 * render (Date.now es impuro — el linter de React lo prohíbe fuera de
 * `useSyncExternalStore`, que es exactamente el escape hatch pensado para
 * leer una fuente de verdad externa/mutable como el reloj). Se resuscribe
 * cada `intervalMs` y en cada `visibilitychange`, para que timers basados
 * en timestamp absoluto (ver ADR-012) se recalculen bien al volver de
 * background.
 *
 * `getSnapshot` DEBE devolver un valor cacheado, no recalcular `Date.now()`
 * en cada llamada — React llama a `getSnapshot` varias veces por render
 * para detectar "tearing", y si el valor cambia entre esas llamadas (como
 * pasa siempre con un reloj real) lo toma como que el store cambió en
 * medio del render y entra en loop ("Maximum update depth exceeded" /
 * "The result of getSnapshot should be cached to avoid an infinite loop").
 * Por eso el valor vive en un ref y sólo se actualiza dentro de `tick`,
 * disparado por el propio `subscribe` — nunca dentro de `getSnapshot`.
 */
export function useNow(intervalMs: number, active: boolean): number {
  const cached = useRef(active ? new Date().getTime() : 0);

  const subscribe = useCallback(
    (callback: () => void) => {
      if (!active) return () => {};
      function tick() {
        cached.current = Date.now();
        callback();
      }
      const id = setInterval(tick, intervalMs);
      const onVisible = () => {
        if (document.visibilityState === "visible") tick();
      };
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        clearInterval(id);
        document.removeEventListener("visibilitychange", onVisible);
      };
    },
    [intervalMs, active],
  );

  const getSnapshot = useCallback(() => cached.current, []);

  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
