import { NextResponse } from "next/server";
import { db } from "@/db";
import { requireUserId } from "@/server/auth/session";
import { restoreUserDataDump, type UserDataDump } from "@/server/export/dump";
import { userDataDumpSchema } from "@/lib/validation/export-dump";
import { reviveDates } from "@/lib/json-date-reviver";
import { logger } from "@/server/logger";

/**
 * Restaura un backup — reemplaza TODOS los datos del usuario (ver el
 * comentario en restoreUserDataDump). La confirmación explícita la exige
 * la UI, no esta ruta; acá sólo se valida forma y se aplica.
 */
export async function POST(request: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const revived = json != null ? reviveDates(json) : null;
  const parsed = userDataDumpSchema.safeParse(revived);
  if (!parsed.success) {
    return NextResponse.json({ error: "Archivo de backup inválido" }, { status: 400 });
  }

  // Boundary cast único: el JSON externo ya pasó por Zod (fechas incluidas
  // vía z.coerce.date()); de acá para adentro se trata como el tipo interno
  // real que devuelve buildUserDataDump.
  try {
    await restoreUserDataDump(db, userId, parsed.data as unknown as UserDataDump);
  } catch (err) {
    logger.error("fallo al restaurar un backup", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  logger.info("backup restaurado", { userId });
  return NextResponse.json({ ok: true });
}
