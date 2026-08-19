/**
 * Semanas ISO (lunes a domingo) para agrupar volumen/series — evitar
 * `date_trunc('week', ...)` en SQL por husos horarios; a esta escala
 * (2 usuarios) agrupar en JS después de traer las filas es más simple y
 * más fácil de testear que hacerlo en la query.
 */
export function startOfIsoWeek(date: Date): Date {
  // Getters UTC a propósito: mezclar Date.UTC() con getFullYear()/getDate()
  // (locales) corre el día según la zona horaria del proceso — con
  // TZ=America/Mexico_City (docker-compose.yml) un "2026-01-12" (medianoche
  // UTC) cae en 11 de enero local, y la semana calculada queda mal.
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = d.getUTCDay(); // 0=domingo..6=sábado
  const diff = day === 0 ? -6 : 1 - day; // retrocede hasta el lunes
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export function isoWeekKey(date: Date): string {
  return startOfIsoWeek(date).toISOString().slice(0, 10);
}

export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
