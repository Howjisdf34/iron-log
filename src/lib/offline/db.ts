import Dexie, { type EntityTable } from "dexie";
import type { LogSetInput } from "@/lib/validation/workout";

/**
 * IndexedDB es la fuente de verdad durante una sesión offline (CLAUDE.md
 * §5.5). Sólo guarda lo mínimo para el outbox de `set_logs` — el resto del
 * Workout Player (qué ejercicios hay, prescripción, "última vez") ya llega
 * precargado en el HTML de la página y no necesita reescribirse acá; sólo
 * las mutaciones nuevas necesitan sobrevivir un corte de red.
 */
export interface OutboxEntry {
  /** = clientId del set_log — también es la clave de idempotencia en Postgres. */
  id: string;
  sessionId: string;
  payload: LogSetInput;
  createdAt: number;
  attempts: number;
  lastError: string | null;
}

export const offlineDb = new Dexie("iron-log-offline") as Dexie & {
  outbox: EntityTable<OutboxEntry, "id">;
};

offlineDb.version(1).stores({
  outbox: "id, sessionId, createdAt",
});
