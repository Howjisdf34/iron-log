/**
 * Web Notification para el fin del descanso. `new Notification()` directo
 * no funciona en algunos navegadores móviles (piden pasar por un Service
 * Worker) — el fallback silencioso acá se resuelve del todo en Fase 5
 * cuando entre Serwist. Mientras tanto funciona en desktop y en la mayoría
 * de Android/Chrome.
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function notifyRestDone(nextLabel: string | null): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification("Descanso terminado", {
      body: nextLabel ?? "Volvé a la serie",
      tag: "iron-log-rest",
      silent: true,
    });
  } catch {
    // degradación silenciosa (ver comentario arriba)
  }
}
