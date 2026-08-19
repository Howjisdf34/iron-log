"use client";

import { useEffect } from "react";
import { flushOutbox } from "./outbox";

/** Vacía el outbox al montar (por si quedó algo de una sesión previa cortada) y en cada `online`. */
export function useOutboxSync(): void {
  useEffect(() => {
    void flushOutbox();
    function onOnline() {
      void flushOutbox();
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);
}
