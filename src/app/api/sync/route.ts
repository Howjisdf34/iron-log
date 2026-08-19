import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { requireUserId } from "@/server/auth/session";
import { logSetForUser } from "@/server/workout/mutations";
import { logSetSchema } from "@/lib/validation/workout";
import { logger } from "@/server/logger";

/**
 * Batch del outbox offline (CLAUDE.md §5.5). Idempotente por construcción:
 * `logSetForUser` inserta con `onConflictDoNothing` sobre `clientId`, así
 * que reenviar el mismo batch 3 veces dejaría los mismos datos — no hace
 * falta lógica de deduplicación acá, sólo delegar y reportar qué entró.
 */
const syncBatchSchema = z.object({
  setLogs: z.array(logSetSchema).min(1).max(200),
});

export async function POST(request: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = syncBatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Batch inválido" }, { status: 400 });
  }

  const synced: string[] = [];
  const errors: { clientId: string; message: string }[] = [];

  for (const item of parsed.data.setLogs) {
    try {
      await logSetForUser(db, userId, item);
      synced.push(item.clientId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      errors.push({ clientId: item.clientId, message });
      logger.warn("fallo al sincronizar una serie del outbox", { userId, message });
    }
  }

  return NextResponse.json({ synced, errors });
}
