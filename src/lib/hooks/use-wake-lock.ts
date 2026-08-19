"use client";

import { useEffect, useRef } from "react";

/** Mantiene la pantalla encendida mientras `active` sea true. Fallback silencioso si el navegador no soporta Wake Lock API (CLAUDE.md §5.3). */
export function useWakeLock(active: boolean): void {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let cancelled = false;

    async function acquire() {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          await lock.release();
          return;
        }
        lockRef.current = lock;
      } catch {
        // Puede fallar por batería baja o restricciones del navegador — no es crítico.
      }
    }
    void acquire();

    function onVisible() {
      if (document.visibilityState === "visible" && !lockRef.current) void acquire();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lockRef.current?.release();
      lockRef.current = null;
    };
  }, [active]);
}
