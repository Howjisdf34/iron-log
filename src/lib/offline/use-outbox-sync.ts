"use client";

import { useEffect } from "react";

/**
 * Vacía el outbox al montar (por si quedó algo de una sesión previa
 * cortada) y en cada `online`. `import()` dinámico a propósito: Dexie no
 * debe formar parte del "first load JS" de páginas que nunca tocan el
 * outbox (p. ej. /login) — ver ADR-022 en docs/ARCHITECTURE.md.
 */
export function useOutboxSync(): void {
  useEffect(() => {
    let cancelled = false;

    function flush() {
      void import("./outbox").then(({ flushOutbox }) => {
        if (!cancelled) void flushOutbox();
      });
    }

    flush();
    window.addEventListener("online", flush);
    return () => {
      cancelled = true;
      window.removeEventListener("online", flush);
    };
  }, []);
}
