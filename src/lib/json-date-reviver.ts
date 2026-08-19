/**
 * `JSON.parse` no revive `Date` — cualquier timestamp exportado vuelve
 * como string plano. Enumerar a mano qué campos son fecha en un dump
 * anidado (rutinas→días→ejercicios→series, sesiones→series, ...) es
 * frágil: un campo `timestamp` olvidado revienta el insert de Drizzle en
 * runtime con "value.toISOString is not a function" (bug real,
 * encontrado por el test de integración de export/import). Este reviver
 * recorre el árbol entero y convierte cualquier string con forma de
 * timestamp ISO — no las fechas simples tipo "2026-01-15" de
 * `body_metrics.date`, que Drizzle sí espera como string.
 */
const ISO_TIMESTAMP_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export function reviveDates(value: unknown): unknown {
  if (typeof value === "string" && ISO_TIMESTAMP_RE.test(value)) {
    return new Date(value);
  }
  if (Array.isArray(value)) {
    return value.map(reviveDates);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        reviveDates(v),
      ]),
    );
  }
  return value;
}
