/**
 * Coordenadas del mapa muscular — esquemático, no anatómico detallado
 * (silueta simple + óvalos clicables). `slug` debe existir en la tabla
 * `muscles` (Fase 2). viewBox compartido: 0 0 200 400.
 */
export interface MuscleRegion {
  slug: string;
  label: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export const FRONT_REGIONS: MuscleRegion[] = [
  { slug: "hombros", label: "Hombros", cx: 58, cy: 68, rx: 13, ry: 12 },
  { slug: "hombros", label: "Hombros", cx: 142, cy: 68, rx: 13, ry: 12 },
  { slug: "pecho", label: "Pecho", cx: 100, cy: 90, rx: 30, ry: 18 },
  { slug: "serrato-anterior", label: "Serrato anterior", cx: 74, cy: 108, rx: 8, ry: 12 },
  {
    slug: "serrato-anterior",
    label: "Serrato anterior",
    cx: 126,
    cy: 108,
    rx: 8,
    ry: 12,
  },
  { slug: "biceps", label: "Bíceps", cx: 38, cy: 100, rx: 10, ry: 20 },
  { slug: "biceps", label: "Bíceps", cx: 162, cy: 100, rx: 10, ry: 20 },
  { slug: "braquial", label: "Braquial", cx: 38, cy: 130, rx: 9, ry: 14 },
  { slug: "braquial", label: "Braquial", cx: 162, cy: 130, rx: 9, ry: 14 },
  { slug: "abdominales", label: "Abdominales", cx: 100, cy: 130, rx: 20, ry: 26 },
  { slug: "oblicuos", label: "Oblicuos", cx: 76, cy: 132, rx: 9, ry: 20 },
  { slug: "oblicuos", label: "Oblicuos", cx: 124, cy: 132, rx: 9, ry: 20 },
  { slug: "cuadriceps", label: "Cuádriceps", cx: 82, cy: 225, rx: 15, ry: 34 },
  { slug: "cuadriceps", label: "Cuádriceps", cx: 118, cy: 225, rx: 15, ry: 34 },
];

export const BACK_REGIONS: MuscleRegion[] = [
  { slug: "trapecio", label: "Trapecio", cx: 100, cy: 68, rx: 26, ry: 16 },
  { slug: "dorsal", label: "Dorsal ancho", cx: 100, cy: 105, rx: 32, ry: 26 },
  { slug: "triceps", label: "Tríceps", cx: 38, cy: 100, rx: 10, ry: 20 },
  { slug: "triceps", label: "Tríceps", cx: 162, cy: 100, rx: 10, ry: 20 },
  { slug: "gluteos", label: "Glúteos", cx: 100, cy: 178, rx: 26, ry: 16 },
  { slug: "isquiotibiales", label: "Isquiotibiales", cx: 82, cy: 225, rx: 15, ry: 32 },
  { slug: "isquiotibiales", label: "Isquiotibiales", cx: 118, cy: 225, rx: 15, ry: 32 },
  { slug: "gemelos", label: "Gemelos", cx: 82, cy: 282, rx: 11, ry: 20 },
  { slug: "gemelos", label: "Gemelos", cx: 118, cy: 282, rx: 11, ry: 20 },
  { slug: "soleo", label: "Sóleo", cx: 82, cy: 305, rx: 9, ry: 12 },
  { slug: "soleo", label: "Sóleo", cx: 118, cy: 305, rx: 9, ry: 12 },
];

/** Silueta compartida entre front/back — misma forma, distintos músculos encima. */
export const BODY_OUTLINE_PATH =
  "M100,10 a20,20 0 1,0 0.1,0 z " + // cabeza
  "M92,30 h16 v14 h-16 z " + // cuello
  "M62,44 h76 a8,8 0 0 1 8,8 v78 a10,10 0 0 1 -10,10 h-72 a10,10 0 0 1 -10,-10 v-78 a8,8 0 0 1 8,-8 z " + // torso
  "M28,52 h20 v95 h-20 a10,10 0 0 1 -10,-10 v-75 a10,10 0 0 1 10,-10 z " + // brazo izq
  "M152,52 h20 a10,10 0 0 1 10,10 v75 a10,10 0 0 1 -10,10 h-20 z " + // brazo der
  "M68,140 h30 v90 a15,15 0 0 1 -15,15 a15,15 0 0 1 -15,-15 z " + // pierna izq
  "M102,140 h30 v90 a15,15 0 0 1 -15,15 a15,15 0 0 1 -15,-15 z " + // pierna der
  "M73,230 h20 v90 h-20 z " + // pantorrilla izq
  "M107,230 h20 v90 h-20 z"; // pantorrilla der
