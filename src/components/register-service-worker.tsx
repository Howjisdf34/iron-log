"use client";

import { useEffect } from "react";

/**
 * `public/sw.js` sólo existe en un build de producción (ver
 * scripts/build-sw.ts) — registrar en dev sólo produciría un 404.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sin service worker el sitio sigue funcionando online normal —
      // sólo se pierde el offline/instalable, no es un error fatal.
    });
  }, []);

  return null;
}
