import { z } from "zod";

/**
 * Valida la FORMA de un dump subido para restaurar (CLAUDE.md §5.4). Las
 * fechas ya llegan revividas por `reviveDates` (src/lib/json-date-reviver.ts)
 * antes de esto — acá sólo se listan los ids/fechas que hace falta que
 * tengan el tipo correcto para el insert, con `.passthrough()` en el
 * resto porque esto sólo está pensado para reimportar un export generado
 * por esta misma app, no como formato de intercambio general.
 */

const routineSetSchema = z.object({ id: z.string().uuid() }).passthrough();
const routineExerciseSchema = z
  .object({ id: z.string().uuid(), sets: z.array(routineSetSchema) })
  .passthrough();
const routineDaySchema = z
  .object({ id: z.string().uuid(), exercises: z.array(routineExerciseSchema) })
  .passthrough();
const routineSchema = z
  .object({ id: z.string().uuid(), days: z.array(routineDaySchema) })
  .passthrough();

const setLogSchema = z
  .object({ id: z.string().uuid(), sessionId: z.string().uuid() })
  .passthrough();
const sessionSchema = z
  .object({ id: z.string().uuid(), startedAt: z.date(), sets: z.array(setLogSchema) })
  .passthrough();

const personalRecordSchema = z.object({ id: z.string().uuid() }).passthrough();
const bodyMetricSchema = z
  .object({ id: z.string().uuid(), date: z.string() })
  .passthrough();
const plateInventorySchema = z.object({ id: z.string().uuid() }).passthrough();
const userSettingsSchema = z.object({ id: z.string().uuid() }).passthrough();

export const userDataDumpSchema = z.object({
  version: z.literal(1),
  // Sólo informativo (nunca se inserta) — el reviver de fechas lo puede
  // convertir a Date igual que cualquier otro timestamp ISO, así que se
  // acepta cualquiera de las dos formas.
  exportedAt: z.union([z.string(), z.date()]),
  routines: z.array(routineSchema),
  sessions: z.array(sessionSchema),
  personalRecords: z.array(personalRecordSchema),
  bodyMetrics: z.array(bodyMetricSchema),
  plateInventory: plateInventorySchema.nullable(),
  userSettings: userSettingsSchema.nullable(),
});
