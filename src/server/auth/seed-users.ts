import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "./password";
import { logger } from "@/server/logger";

const seedUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});
const seedUsersSchema = z.array(seedUserSchema);

/**
 * Crea usuarios desde SEED_USERS (JSON) sólo si la tabla está vacía —
 * alternativa a `pnpm user:create` para el primer arranque en el VPS.
 * No hace nada en arranques posteriores (idempotente por construcción:
 * sólo actúa cuando la tabla de usuarios está realmente vacía).
 */
export async function seedUsersIfNeeded(): Promise<void> {
  const raw = process.env.SEED_USERS;
  if (!raw) return;

  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length > 0) return;

  const parsed = seedUsersSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    logger.error("SEED_USERS inválido", { error: parsed.error.message });
    return;
  }

  for (const u of parsed.data) {
    const passwordHash = await hashPassword(u.password);
    const [created] = await db
      .insert(users)
      .values({ email: u.email, name: u.name, passwordHash })
      .returning({ id: users.id });
    // sin email/nombre en el log — sólo el id, ver src/server/logger.ts
    logger.info("usuario creado desde SEED_USERS", { userId: created!.id });
  }
}
