"use client";

import { useState } from "react";
import { Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MEDIA_CACHE_NAME } from "@/lib/offline/media-cache";
import type { RoutineWithDetails } from "@/server/db/routines";

function collectMediaUrls(routine: RoutineWithDetails): string[] {
  const urls = new Set<string>();
  for (const day of routine.days) {
    for (const re of day.exercises) {
      for (const m of re.exercise.media) {
        urls.add(`/media/${m.localPath}`);
        if (m.posterPath) urls.add(`/media/${m.posterPath}`);
      }
    }
  }
  return [...urls];
}

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/** Precarga deliberada de la media de una rutina en el cache del Service Worker (CLAUDE.md §5.5). */
export function DownloadOfflineButton({ routine }: { routine: RoutineWithDetails }) {
  const [state, setState] = useState<"idle" | "downloading" | "done" | "error">("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0, bytes: 0 });

  async function handleDownload() {
    if (typeof caches === "undefined") {
      setState("error");
      return;
    }
    const urls = collectMediaUrls(routine);
    if (urls.length === 0) {
      setState("done");
      return;
    }

    setState("downloading");
    setProgress({ done: 0, total: urls.length, bytes: 0 });

    const cache = await caches.open(MEDIA_CACHE_NAME);
    let done = 0;
    let bytes = 0;

    for (const url of urls) {
      const existing = await cache.match(url);
      if (!existing) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            bytes += Number(res.headers.get("content-length") ?? 0);
            await cache.put(url, res.clone());
          }
        } catch {
          // un archivo que falla no bloquea la descarga del resto
        }
      }
      done += 1;
      setProgress({ done, total: urls.length, bytes });
    }
    setState("done");
  }

  if (state === "done") {
    return (
      <Button type="button" variant="outline" size="sm" disabled>
        <Check className="size-4" /> Descargado para offline
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={state === "downloading"}
    >
      <Download className="size-4" />
      {state === "downloading"
        ? `Descargando ${progress.done}/${progress.total} (${formatMb(progress.bytes)})…`
        : state === "error"
          ? "No disponible en este navegador"
          : "Descargar para offline"}
    </Button>
  );
}
