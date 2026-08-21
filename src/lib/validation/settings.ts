import { z } from "zod";

export const updateUserSettingsSchema = z.object({
  theme: z.enum(["light", "dark"]).optional(),
});

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
