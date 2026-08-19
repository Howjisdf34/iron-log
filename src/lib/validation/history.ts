import { z } from "zod";

export const bodyMetricSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  weightKg: z.number().min(20).max(400).nullable().optional(),
  bodyFatPct: z.number().min(1).max(70).nullable().optional(),
  chest: z.number().min(10).max(300).nullable().optional(),
  waist: z.number().min(10).max(300).nullable().optional(),
  arm: z.number().min(5).max(100).nullable().optional(),
  thigh: z.number().min(5).max(150).nullable().optional(),
});

export const updateSessionMetaSchema = z.object({
  sessionId: z.string().uuid(),
  bodyweightKg: z.number().min(20).max(400).nullable().optional(),
  mood: z.number().int().min(1).max(5).nullable().optional(),
  energy: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export type BodyMetricInput = z.infer<typeof bodyMetricSchema>;
export type UpdateSessionMetaInput = z.infer<typeof updateSessionMetaSchema>;
