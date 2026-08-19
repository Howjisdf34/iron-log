import type { ExerciseCategory } from "../seed/normalize";

/**
 * Plantillas prearmadas (CLAUDE.md §5.2). Los `exerciseSlug` están
 * verificados contra el catálogo real sembrado en Fase 2 — no inventados.
 * Si `pnpm seed:exercises` corre contra una versión distinta de wger y un
 * slug ya no existe, `createRoutineFromTemplate` lo salta con un warning
 * en vez de fallar la rutina entera (ver src/server/routines/actions.ts).
 */

export type TemplateGoal = "strength" | "hypertrophy" | "endurance" | "recomp";
export type TemplateSplit =
  "ppl" | "upper_lower" | "full_body" | "arnold" | "bro_split" | "custom";

export interface TemplateSet {
  setType: "warmup" | "working";
  targetRepsMin?: number;
  targetRepsMax?: number;
  targetReps?: number;
  targetRpe?: number;
}

export interface TemplateExercise {
  exerciseSlug: string;
  sets: TemplateSet[];
  restSeconds: number;
  tempo?: string;
  supersetGroup?: number;
}

export interface TemplateDay {
  name: string;
  exercises: TemplateExercise[];
}

export interface RoutineTemplate {
  id: string;
  name: string;
  description: string;
  goal: TemplateGoal;
  splitType: TemplateSplit;
  daysPerWeek: number;
  category: ExerciseCategory | null; // sin uso, placeholder de tipo futuro
  days: TemplateDay[];
}

const hyp3x10: TemplateSet[] = [
  { setType: "warmup", targetReps: 10, targetRpe: 5 },
  { setType: "working", targetRepsMin: 8, targetRepsMax: 10, targetRpe: 8 },
  { setType: "working", targetRepsMin: 8, targetRepsMax: 10, targetRpe: 8 },
  { setType: "working", targetRepsMin: 8, targetRepsMax: 10, targetRpe: 9 },
];
const hyp3x12: TemplateSet[] = [
  { setType: "working", targetRepsMin: 10, targetRepsMax: 12, targetRpe: 8 },
  { setType: "working", targetRepsMin: 10, targetRepsMax: 12, targetRpe: 8 },
  { setType: "working", targetRepsMin: 10, targetRepsMax: 12, targetRpe: 9 },
];
const hyp4x8: TemplateSet[] = [
  { setType: "warmup", targetReps: 10, targetRpe: 5 },
  { setType: "working", targetRepsMin: 6, targetRepsMax: 8, targetRpe: 8 },
  { setType: "working", targetRepsMin: 6, targetRepsMax: 8, targetRpe: 8 },
  { setType: "working", targetRepsMin: 6, targetRepsMax: 8, targetRpe: 9 },
  { setType: "working", targetRepsMin: 6, targetRepsMax: 8, targetRpe: 9 },
];
const strength5x5: TemplateSet[] = [
  { setType: "warmup", targetReps: 5, targetRpe: 5 },
  { setType: "working", targetReps: 5, targetRpe: 7 },
  { setType: "working", targetReps: 5, targetRpe: 8 },
  { setType: "working", targetReps: 5, targetRpe: 8 },
  { setType: "working", targetReps: 5, targetRpe: 9 },
];
const strength1x5: TemplateSet[] = [
  { setType: "warmup", targetReps: 5, targetRpe: 5 },
  { setType: "working", targetReps: 5, targetRpe: 8 },
];

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: "ppl-6",
    name: "Push/Pull/Legs (6 días)",
    description: "Clásico de hipertrofia — cada patrón de movimiento 2x/semana.",
    goal: "hypertrophy",
    splitType: "ppl",
    daysPerWeek: 6,
    category: null,
    days: [
      {
        name: "Push A",
        exercises: [
          { exerciseSlug: "bench-press", sets: hyp4x8, restSeconds: 150 },
          { exerciseSlug: "overhead-press", sets: hyp3x10, restSeconds: 120 },
          { exerciseSlug: "dips", sets: hyp3x10, restSeconds: 90 },
          { exerciseSlug: "lateral-raises", sets: hyp3x12, restSeconds: 60 },
        ],
      },
      {
        name: "Pull A",
        exercises: [
          { exerciseSlug: "bent-over-rowing", sets: hyp4x8, restSeconds: 150 },
          { exerciseSlug: "pull-ups", sets: hyp3x10, restSeconds: 120 },
          { exerciseSlug: "seated-cable-row", sets: hyp3x12, restSeconds: 90 },
          { exerciseSlug: "dumbbell-curl", sets: hyp3x12, restSeconds: 60 },
        ],
      },
      {
        name: "Legs A",
        exercises: [
          { exerciseSlug: "squats", sets: hyp4x8, restSeconds: 180 },
          { exerciseSlug: "romanian-deadlift", sets: hyp3x10, restSeconds: 120 },
          { exerciseSlug: "leg-press", sets: hyp3x12, restSeconds: 120 },
          { exerciseSlug: "standing-calf-raises", sets: hyp3x12, restSeconds: 60 },
        ],
      },
      {
        name: "Push B",
        exercises: [
          { exerciseSlug: "overhead-press", sets: hyp4x8, restSeconds: 150 },
          { exerciseSlug: "bench-press", sets: hyp3x10, restSeconds: 120 },
          { exerciseSlug: "tricep-dumbbell-kickback", sets: hyp3x12, restSeconds: 60 },
          { exerciseSlug: "lateral-raises", sets: hyp3x12, restSeconds: 60 },
        ],
      },
      {
        name: "Pull B",
        exercises: [
          {
            exerciseSlug: "wide-grip-supinated-lat-pulldown",
            sets: hyp4x8,
            restSeconds: 120,
          },
          { exerciseSlug: "chin-up", sets: hyp3x10, restSeconds: 120 },
          { exerciseSlug: "seated-cable-row", sets: hyp3x12, restSeconds: 90 },
          { exerciseSlug: "dumbbell-curl", sets: hyp3x12, restSeconds: 60 },
        ],
      },
      {
        name: "Legs B",
        exercises: [
          { exerciseSlug: "deadlifts", sets: hyp4x8, restSeconds: 180 },
          { exerciseSlug: "leg-press", sets: hyp3x10, restSeconds: 120 },
          { exerciseSlug: "leg-curl", sets: hyp3x12, restSeconds: 90 },
          { exerciseSlug: "leg-extension", sets: hyp3x12, restSeconds: 90 },
          { exerciseSlug: "standing-calf-raises", sets: hyp3x12, restSeconds: 60 },
        ],
      },
    ],
  },
  {
    id: "upper-lower-4",
    name: "Upper/Lower (4 días)",
    description: "Buen balance frecuencia/recuperación — 2x/semana cada grupo.",
    goal: "hypertrophy",
    splitType: "upper_lower",
    daysPerWeek: 4,
    category: null,
    days: [
      {
        name: "Upper A",
        exercises: [
          { exerciseSlug: "bench-press", sets: hyp4x8, restSeconds: 150 },
          { exerciseSlug: "bent-over-rowing", sets: hyp4x8, restSeconds: 150 },
          { exerciseSlug: "overhead-press", sets: hyp3x10, restSeconds: 120 },
          { exerciseSlug: "pull-ups", sets: hyp3x10, restSeconds: 120 },
          { exerciseSlug: "dumbbell-curl", sets: hyp3x12, restSeconds: 60 },
          { exerciseSlug: "triceps-pushdown", sets: hyp3x12, restSeconds: 60 },
        ],
      },
      {
        name: "Lower A",
        exercises: [
          { exerciseSlug: "squats", sets: hyp4x8, restSeconds: 180 },
          { exerciseSlug: "romanian-deadlift", sets: hyp3x10, restSeconds: 120 },
          { exerciseSlug: "leg-curl", sets: hyp3x12, restSeconds: 90 },
          { exerciseSlug: "standing-calf-raises", sets: hyp3x12, restSeconds: 60 },
        ],
      },
      {
        name: "Upper B",
        exercises: [
          { exerciseSlug: "overhead-press", sets: hyp4x8, restSeconds: 150 },
          { exerciseSlug: "seated-cable-row", sets: hyp4x8, restSeconds: 120 },
          { exerciseSlug: "dips", sets: hyp3x10, restSeconds: 90 },
          {
            exerciseSlug: "wide-grip-supinated-lat-pulldown",
            sets: hyp3x10,
            restSeconds: 120,
          },
          { exerciseSlug: "lateral-raises", sets: hyp3x12, restSeconds: 60 },
          { exerciseSlug: "tricep-dumbbell-kickback", sets: hyp3x12, restSeconds: 60 },
        ],
      },
      {
        name: "Lower B",
        exercises: [
          { exerciseSlug: "deadlifts", sets: hyp4x8, restSeconds: 180 },
          { exerciseSlug: "leg-press", sets: hyp3x10, restSeconds: 120 },
          { exerciseSlug: "lunges", sets: hyp3x12, restSeconds: 90 },
          { exerciseSlug: "leg-extension", sets: hyp3x12, restSeconds: 90 },
          { exerciseSlug: "standing-calf-raises", sets: hyp3x12, restSeconds: 60 },
        ],
      },
    ],
  },
  {
    id: "full-body-3",
    name: "Full Body (3 días)",
    description: "Ideal con poco tiempo — todo el cuerpo cada sesión.",
    goal: "hypertrophy",
    splitType: "full_body",
    daysPerWeek: 3,
    category: null,
    days: [
      {
        name: "Full Body A",
        exercises: [
          { exerciseSlug: "squats", sets: hyp4x8, restSeconds: 180 },
          { exerciseSlug: "bench-press", sets: hyp3x10, restSeconds: 120 },
          { exerciseSlug: "bent-over-rowing", sets: hyp3x10, restSeconds: 120 },
          { exerciseSlug: "plank", sets: hyp3x12, restSeconds: 60 },
        ],
      },
      {
        name: "Full Body B",
        exercises: [
          { exerciseSlug: "deadlifts", sets: hyp4x8, restSeconds: 180 },
          { exerciseSlug: "overhead-press", sets: hyp3x10, restSeconds: 120 },
          { exerciseSlug: "pull-ups", sets: hyp3x10, restSeconds: 120 },
          { exerciseSlug: "standing-calf-raises", sets: hyp3x12, restSeconds: 60 },
        ],
      },
      {
        name: "Full Body C",
        exercises: [
          { exerciseSlug: "leg-press", sets: hyp4x8, restSeconds: 120 },
          { exerciseSlug: "dips", sets: hyp3x10, restSeconds: 90 },
          { exerciseSlug: "seated-cable-row", sets: hyp3x10, restSeconds: 90 },
          { exerciseSlug: "dumbbell-curl", sets: hyp3x12, restSeconds: 60 },
        ],
      },
    ],
  },
  {
    id: "strength-5x5",
    name: "Fuerza 5x5 (3 días)",
    description: "Progresión lineal clásica — sentadilla en cada sesión, A/B alternados.",
    goal: "strength",
    splitType: "custom",
    daysPerWeek: 3,
    category: null,
    days: [
      {
        name: "A",
        exercises: [
          { exerciseSlug: "squats", sets: strength5x5, restSeconds: 180 },
          { exerciseSlug: "bench-press", sets: strength5x5, restSeconds: 180 },
          { exerciseSlug: "bent-over-rowing", sets: strength5x5, restSeconds: 150 },
        ],
      },
      {
        name: "B",
        exercises: [
          { exerciseSlug: "squats", sets: strength5x5, restSeconds: 180 },
          { exerciseSlug: "overhead-press", sets: strength5x5, restSeconds: 180 },
          { exerciseSlug: "deadlifts", sets: strength1x5, restSeconds: 240 },
        ],
      },
    ],
  },
];

export function getTemplate(id: string): RoutineTemplate | undefined {
  return ROUTINE_TEMPLATES.find((t) => t.id === id);
}
