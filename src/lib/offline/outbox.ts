"use client";

import { offlineDb } from "./db";
import type { LogSetInput } from "@/lib/validation/workout";

/**
 * Outbox pattern (CLAUDE.md §5.5): encolar es local e instantáneo — la UI
 * nunca espera a la red para mostrar una serie completada. `flushOutbox`
 * se llama al recuperar conexión (evento `online`) y al montar la app; es
 * el fallback universal a Background Sync API, que no existe en
 * Safari/iOS (ver ADR-016 en docs/ARCHITECTURE.md).
 */

export async function enqueueSetLog(payload: LogSetInput): Promise<void> {
  await offlineDb.outbox.put({
    id: payload.clientId,
    sessionId: payload.sessionId,
    payload,
    createdAt: Date.now(),
    attempts: 0,
    lastError: null,
  });
}

let flushing = false;

export async function flushOutbox(): Promise<{ synced: number; failed: number }> {
  if (flushing) return { synced: 0, failed: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine)
    return { synced: 0, failed: 0 };

  flushing = true;
  try {
    const entries = await offlineDb.outbox.orderBy("createdAt").toArray();
    if (entries.length === 0) return { synced: 0, failed: 0 };

    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setLogs: entries.map((e) => e.payload) }),
    });
    if (!res.ok) return { synced: 0, failed: entries.length };

    const body = (await res.json()) as {
      synced: string[];
      errors: { clientId: string; message: string }[];
    };

    if (body.synced.length > 0) {
      await offlineDb.outbox.bulkDelete(body.synced);
    }
    if (body.errors.length > 0) {
      const messageByClientId = new Map(body.errors.map((e) => [e.clientId, e.message]));
      await offlineDb.outbox
        .where("id")
        .anyOf(body.errors.map((e) => e.clientId))
        .modify((entry) => {
          entry.attempts += 1;
          entry.lastError = messageByClientId.get(entry.id) ?? "Error desconocido";
        });
    }

    return { synced: body.synced.length, failed: body.errors.length };
  } catch {
    // Sin red o el server no respondió — se reintenta en el próximo `online`.
    return { synced: 0, failed: 0 };
  } finally {
    flushing = false;
  }
}
