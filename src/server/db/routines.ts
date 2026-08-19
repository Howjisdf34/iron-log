import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import type { Database } from "@/db";
import { routineDays, routineExercises, routines, type Routine } from "@/db/schema";

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
    .where(and(eq(routines.userId, userId), isNull(routines.archivedAt)))
    .orderBy(desc(routines.createdAt));
}

export async function listArchivedRoutinesForUser(
  db: Database,
  userId: string,
): Promise<Routine[]> {
  return db
    .select()
    .from(routines)
    .where(and(eq(routines.userId, userId), isNotNull(routines.archivedAt)))
    .orderBy(desc(routines.archivedAt));
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

/** Rutina completa: días -> ejercicios -> series, con el ejercicio del catálogo. */
export async function getRoutineWithDetails(
  db: Database,
  userId: string,
  routineId: string,
) {
  const routine = await db.query.routines.findFirst({
    where: (r, { and: andOp, eq: eqOp }) =>
      andOp(eqOp(r.id, routineId), eqOp(r.userId, userId)),
    with: {
      days: {
        orderBy: (d, { asc }) => [asc(d.order)],
        with: {
          exercises: {
            orderBy: (e, { asc }) => [asc(e.order)],
            with: {
              exercise: true,
              sets: { orderBy: (s, { asc }) => [asc(s.setNumber)] },
            },
          },
        },
      },
    },
  });
  return routine;
}

/**
 * `routine_days`/`routine_exercises` no tienen `userId` propio — la
 * ownership se prueba con join hasta `routines`. Lanza si no existe o no
 * es del usuario, en vez de devolver undefined: toda action que llama esto
 * quiere fallar fuerte, no seguir con un id ajeno.
 */
export async function assertDayOwnership(
  db: Database,
  userId: string,
  dayId: string,
): Promise<{ routineId: string }> {
  const [row] = await db
    .select({ routineId: routineDays.routineId })
    .from(routineDays)
    .innerJoin(routines, eq(routines.id, routineDays.routineId))
    .where(and(eq(routineDays.id, dayId), eq(routines.userId, userId)))
    .limit(1);
  if (!row) throw new Error("Día no encontrado");
  return row;
}

export async function assertRoutineExerciseOwnership(
  db: Database,
  userId: string,
  routineExerciseId: string,
): Promise<{ dayId: string; routineId: string }> {
  const [row] = await db
    .select({ dayId: routineExercises.dayId, routineId: routineDays.routineId })
    .from(routineExercises)
    .innerJoin(routineDays, eq(routineDays.id, routineExercises.dayId))
    .innerJoin(routines, eq(routines.id, routineDays.routineId))
    .where(and(eq(routineExercises.id, routineExerciseId), eq(routines.userId, userId)))
    .limit(1);
  if (!row) throw new Error("Ejercicio de rutina no encontrado");
  return row;
}

export type RoutineWithDetails = NonNullable<
  Awaited<ReturnType<typeof getRoutineWithDetails>>
>;
export type RoutineDayWithDetails = RoutineWithDetails["days"][number];
export type RoutineExerciseWithDetails = RoutineDayWithDetails["exercises"][number];
