/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { CacheFirst, ExpirationPlugin, Serwist } from "serwist";
import { MEDIA_CACHE_NAME } from "@/lib/offline/media-cache";

declare const self: ServiceWorkerGlobalScope;

const OFFLINE_FALLBACK_CACHE = "offline-fallback";
const OFFLINE_URL = "/offline";

/**
 * Ver ADR-017 en docs/ARCHITECTURE.md: `@serwist/next`'s build plugin
 * (`withSerwistInit`) inyecta el manifest de precache vía webpack, que no
 * corre con Turbopack (el bundler de este proyecto desde la Fase 0) — el
 * build falla ("using Turbopack, with a webpack config"). Este service
 * worker no precachea el app shell entero al instalar; se apoya en el
 * runtime caching normal (`defaultCache`: NetworkFirst para páginas/RSC,
 * StaleWhileRevalidate para estáticos), que ya cubre el caso real: para
 * llegar a `/entrenar/[id]` sin red hacía falta haberlo visitado con red
 * antes — no se puede empezar una sesión offline, así que precachear todo
 * el shell de antemano no agrega nada al criterio de éxito #2 del brief.
 * Sólo `/offline` se cachea a mano en el evento `install`, como fallback
 * cuando una navegación no cacheada falla sin red.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_FALLBACK_CACHE).then((cache) => cache.add(OFFLINE_URL)),
  );
});

const serwist = new Serwist({
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => url.pathname.startsWith("/media/exercises/"),
      handler: new CacheFirst({
        cacheName: MEDIA_CACHE_NAME,
        plugins: [
          // La media es inmutable una vez generada por el seed (mismo
          // criterio que el Cache-Control del route handler) — no
          // necesita maxAgeSeconds, sólo un tope de entradas para no
          // crecer sin límite en el disco del teléfono.
          new ExpirationPlugin({ maxEntries: 500, purgeOnQuotaError: true }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

// `/api/sync` es POST-only — Serwist sólo enruta GET por defecto, así que
// no necesita (ni puede) pasar por acá. Su resiliencia offline la da el
// outbox de Dexie + el evento `online` (src/lib/offline/), no el SW.
serwist.setCatchHandler(async ({ request }) => {
  if (request.destination === "document") {
    const cached = await caches.match(OFFLINE_URL, { cacheName: OFFLINE_FALLBACK_CACHE });
    if (cached) return cached;
  }
  return Response.error();
});

serwist.addEventListeners();
