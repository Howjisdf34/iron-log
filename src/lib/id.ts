import { uuidv7 } from "uuidv7";

/**
 * Único punto de generación de IDs — mismo algoritmo en server (Drizzle
 * $defaultFn) y cliente (Dexie outbox, Fase 5), así los IDs creados offline
 * son válidos y ordenables por tiempo sin coordinarse con el servidor.
 */
export const newId = (): string => uuidv7();
