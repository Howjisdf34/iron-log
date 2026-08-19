import { z } from "zod";

/** Única fuente de verdad — compartida entre wizard, editor y server actions. */

export const setTypeSchema = z.enum([
  "warmup",
  "working",
  "drop",
  "failure",
  "amrap",
  "backoff",
]);

export const routineGoalSchema = z.enum([
  "strength",
  "hypertrophy",
  "endurance",
  "recomp",
]);

export const splitTypeSchema = z.enum([
  "ppl",
  "upper_lower",
  "full_body",
  "arnold",
  "bro_split",
  "custom",
]);

export const createRoutineSchema = z.object({
  name: z.string().trim().min(1, "El nombre no puede estar vacío").max(100),
  description: z.string().trim().max(500).optional(),
  goal: routineGoalSchema,
  splitType: splitTypeSchema,
  daysPerWeek: z.number().int().min(1).max(7),
});

export const routineSetInputSchema = z.object({
  setType: setTypeSchema,
  targetReps: z.number().int().min(1).max(100).nullable().optional(),
  targetRepsMin: z.number().int().min(1).max(100).nullable().optional(),
  targetRepsMax: z.number().int().min(1).max(100).nullable().optional(),
  targetWeightKg: z.number().min(0).max(500).nullable().optional(),
  targetRpe: z.number().min(1).max(10).nullable().optional(),
  restSecondsOverride: z.number().int().min(0).max(900).nullable().optional(),
});

export const addExerciseToDaySchema = z.object({
  dayId: z.string().uuid(),
  exerciseId: z.string().uuid(),
});

export const updateRoutineExerciseSchema = z.object({
  routineExerciseId: z.string().uuid(),
  restSeconds: z.number().int().min(0).max(900).nullable().optional(),
  tempo: z.string().trim().max(20).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  supersetGroup: z.number().int().min(0).nullable().optional(),
});

export const reorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export const exerciseSearchSchema = z.object({
  query: z.string().trim().max(100).optional(),
  muscleSlug: z.string().trim().max(50).optional(),
  equipmentSlug: z.string().trim().max(50).optional(),
  level: z.enum(["beginner", "intermediate", "expert"]).optional(),
  category: z.enum(["compound", "isolation", "cardio", "mobility"]).optional(),
});

export type CreateRoutineInput = z.infer<typeof createRoutineSchema>;
export type RoutineSetInput = z.infer<typeof routineSetInputSchema>;
export type ExerciseSearchInput = z.infer<typeof exerciseSearchSchema>;
