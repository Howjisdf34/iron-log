/**
 * Calculadora de discos (CLAUDE.md §5.3). `platesAvailable` son discos
 * disponibles POR LADO (ver comentario en plate_inventory schema), así que
 * sólo hay que repartir la mitad del peso objetivo menos la barra.
 * Greedy de mayor a menor denominación — óptimo para sets de discos reales
 * (cada denominación cabe un número entero de veces en la siguiente).
 */

export interface PlateInventoryInput {
  barWeightKg: number;
  platesAvailable: Record<string, number>;
}

export interface PlateBreakdown {
  /** Discos a poner de un lado, de mayor a menor. */
  perSide: { plateKg: number; count: number }[];
  /** Peso total real que resulta (barra + ambos lados). */
  totalWeightKg: number;
  /** false si no se pudo alcanzar el objetivo exacto con el inventario dado. */
  exact: boolean;
}

const EPSILON = 0.001;

export function calculatePlateBreakdown(
  targetWeightKg: number,
  inventory: PlateInventoryInput,
): PlateBreakdown {
  const perSideTarget = (targetWeightKg - inventory.barWeightKg) / 2;

  if (perSideTarget <= EPSILON) {
    return {
      perSide: [],
      totalWeightKg: inventory.barWeightKg,
      exact: Math.abs(targetWeightKg - inventory.barWeightKg) < EPSILON,
    };
  }

  const denominations = Object.entries(inventory.platesAvailable)
    .map(([kg, count]) => ({ plateKg: Number(kg), count }))
    .filter((d) => d.plateKg > 0 && d.count > 0)
    .sort((a, b) => b.plateKg - a.plateKg);

  const perSide: { plateKg: number; count: number }[] = [];
  let remaining = perSideTarget;

  for (const d of denominations) {
    let used = 0;
    while (used < d.count && d.plateKg <= remaining + EPSILON) {
      remaining -= d.plateKg;
      used += 1;
    }
    if (used > 0) perSide.push({ plateKg: d.plateKg, count: used });
  }

  const achievedPerSide = perSideTarget - Math.max(remaining, 0);
  const totalWeightKg = inventory.barWeightKg + achievedPerSide * 2;

  return { perSide, totalWeightKg, exact: remaining < EPSILON };
}
