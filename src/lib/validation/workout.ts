import { z } from "zod";
import { setTypeSchema } from "./routines";

/** Única fuente de verdad — compartida entre el Workout Player y las Server Actions. */

export const startSessionSchema = z.object({
  routineDayId: z.string().uuid().nullable().optional(),
});

export const logSetSchema = z.object({
  sessionId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  routineSetId: z.string().uuid().nullable().optional(),
  order: z.number().int().min(0),
  setType: setTypeSchema,
  weightKg: z.number().min(0).max(500).nullable().optional(),
  reps: z.number().int().min(0).max(200).nullable().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  timeSeconds: z.number().int().min(0).max(36000).nullable().optional(),
  distanceM: z.number().min(0).max(200000).nullable().optional(),
  restTakenSeconds: z.number().int().min(0).max(3600).nullable().optional(),
  failed: z.boolean().optional().default(false),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const updateSetLogSchema = z.object({
  setLogId: z.string().uuid(),
  weightKg: z.number().min(0).max(500).nullable().optional(),
  reps: z.number().int().min(0).max(200).nullable().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  failed: z.boolean().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const finishSessionSchema = z.object({
  sessionId: z.string().uuid(),
  bodyweightKg: z.number().min(20).max(400).nullable().optional(),
  mood: z.number().int().min(1).max(5).nullable().optional(),
  energy: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export const updatePlateInventorySchema = z.object({
  barWeightKg: z.number().min(0).max(50),
  platesAvailable: z.record(z.string(), z.number().int().min(0).max(50)),
  unit: z.enum(["kg", "lb"]),
  hasMicroplates: z.boolean(),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type LogSetInput = z.infer<typeof logSetSchema>;
export type UpdateSetLogInput = z.infer<typeof updateSetLogSchema>;
export type FinishSessionInput = z.infer<typeof finishSessionSchema>;
export type UpdatePlateInventoryInput = z.infer<typeof updatePlateInventorySchema>;
