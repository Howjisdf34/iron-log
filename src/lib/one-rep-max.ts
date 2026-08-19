/**
 * 1RM estimado — fórmula de Epley (CLAUDE.md §5.4 pide documentar cuál se
 * usa). Elegida sobre Brzycki por ser más estable en rangos altos de reps
 * (Brzycki diverge/se vuelve negativa cerca de 37 reps); Brzycki queda para
 * la comparativa de gráficas en Fase 6.
 *
 * epley(w, r) = w * (1 + r / 30)
 */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function estimateOneRepMaxBrzycki(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  if (reps >= 37) return weightKg; // fórmula diverge, evitar valores absurdos
  return weightKg * (36 / (37 - reps));
}
