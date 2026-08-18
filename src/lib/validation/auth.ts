import { z } from "zod";

/** Única fuente de verdad para el form de login — cliente y server action. */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;
