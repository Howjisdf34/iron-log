/**
 * wger no da nombres en español para músculos (sólo latín + a veces inglés
 * coloquial) — verificado con GET /api/v2/muscle/. Traducción manual de las
 * 15 entradas fijas del catálogo, terminología estándar de gimnasio.
 */
export const MUSCLE_ES_BY_WGER_ID: Record<number, { nameEs: string; slug: string }> = {
  1: { nameEs: "Bíceps braquial", slug: "biceps" },
  2: { nameEs: "Deltoides anterior", slug: "hombros" },
  3: { nameEs: "Serrato anterior", slug: "serrato-anterior" },
  4: { nameEs: "Pectoral mayor", slug: "pecho" },
  5: { nameEs: "Tríceps braquial", slug: "triceps" },
  6: { nameEs: "Recto abdominal", slug: "abdominales" },
  7: { nameEs: "Gastrocnemio (gemelo)", slug: "gemelos" },
  8: { nameEs: "Glúteo mayor", slug: "gluteos" },
  9: { nameEs: "Trapecio", slug: "trapecio" },
  10: { nameEs: "Cuádriceps", slug: "cuadriceps" },
  11: { nameEs: "Bíceps femoral (isquiotibial)", slug: "isquiotibiales" },
  12: { nameEs: "Dorsal ancho", slug: "dorsal" },
  13: { nameEs: "Braquial", slug: "braquial" },
  14: { nameEs: "Oblicuo externo", slug: "oblicuos" },
  15: { nameEs: "Sóleo", slug: "soleo" },
};
