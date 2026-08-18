import { and, desc, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { routines, type Routine } from "@/db/schema";

/**
 * Convención del proyecto: toda lectura/escritura de datos de usuario pasa
 * por una función como ésta que exige `userId` como primer argumento y lo
 * mete en el `where` — nunca un `select()` sin filtrar. Ver test de
 * aislamiento en routines.integration.test.ts.
 */
export async function listRoutinesForUser(
  db: Database,
  userId: string,
): Promise<Routine[]> {
  return db
    .select()
    .from(routines)
    .where(eq(routines.userId, userId))
    .orderBy(desc(routines.createdAt));
}

export async function getRoutineForUser(
  db: Database,
  userId: string,
  routineId: string,
): Promise<Routine | undefined> {
  const [routine] = await db
    .select()
    .from(routines)
    .where(and(eq(routines.id, routineId), eq(routines.userId, userId)))
    .limit(1);
  return routine;
}
