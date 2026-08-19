import { eq } from "drizzle-orm";
import type { Database } from "@/db";
import {
  bodyMetrics,
  exercises,
  personalRecords,
  plateInventory,
  routineDays,
  routineExercises,
  routineSets,
  routines,
  setLogs,
  userSettings,
  workoutSessions,
  type BodyMetric,
  type PersonalRecord,
  type PlateInventory,
  type UserSettings,
} from "@/db/schema";

/**
 * "Mis datos son míos" (CLAUDE.md §5.4): dump completo de todo lo que el
 * usuario generó — no incluye el catálogo de ejercicios (compartido,
 * read-only, se repuebla con `pnpm seed:exercises`). `version` existe
 * para poder migrar el formato si el schema cambia antes de que alguien
 * necesite restaurar un backup viejo.
 */

export interface UserDataDump {
  version: 1;
  exportedAt: string;
  routines: Awaited<ReturnType<typeof queryRoutines>>;
  sessions: Awaited<ReturnType<typeof querySessions>>;
  personalRecords: PersonalRecord[];
  bodyMetrics: BodyMetric[];
  plateInventory: PlateInventory | null;
  userSettings: UserSettings | null;
}

function queryRoutines(db: Database, userId: string) {
  return db.query.routines.findMany({
    where: (r, { eq: eqOp }) => eqOp(r.userId, userId),
    with: {
      days: {
        with: { exercises: { with: { sets: true } } },
      },
    },
  });
}

function querySessions(db: Database, userId: string) {
  return db.query.workoutSessions.findMany({
    where: (s, { eq: eqOp }) => eqOp(s.userId, userId),
    with: { sets: true },
  });
}

export async function buildUserDataDump(
  db: Database,
  userId: string,
): Promise<UserDataDump> {
  const [userRoutines, sessions, prs, metrics, plates, settings] = await Promise.all([
    queryRoutines(db, userId),
    querySessions(db, userId),
    db.select().from(personalRecords).where(eq(personalRecords.userId, userId)),
    db.select().from(bodyMetrics).where(eq(bodyMetrics.userId, userId)),
    db.select().from(plateInventory).where(eq(plateInventory.userId, userId)),
    db.select().from(userSettings).where(eq(userSettings.userId, userId)),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    routines: userRoutines,
    sessions,
    personalRecords: prs,
    bodyMetrics: metrics,
    plateInventory: plates[0] ?? null,
    userSettings: settings[0] ?? null,
  };
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** CSV plano del log de entrenamiento — la vista tabular más útil para abrir en una hoja de cálculo. */
export async function buildSetLogsCsv(db: Database, userId: string): Promise<string> {
  const rows = await db
    .select({
      startedAt: workoutSessions.startedAt,
      exerciseName: exercises.nameEs,
      setType: setLogs.setType,
      weightKg: setLogs.weightKg,
      reps: setLogs.reps,
      rpe: setLogs.rpe,
      isPr: setLogs.isPr,
      failed: setLogs.failed,
    })
    .from(setLogs)
    .innerJoin(workoutSessions, eq(workoutSessions.id, setLogs.sessionId))
    .innerJoin(exercises, eq(exercises.id, setLogs.exerciseId))
    .where(eq(workoutSessions.userId, userId))
    .orderBy(workoutSessions.startedAt);

  const header = "fecha,ejercicio,tipo,peso_kg,reps,rpe,pr,fallo";
  const lines = rows.map((r) =>
    [
      r.startedAt.toISOString(),
      csvEscape(r.exerciseName),
      r.setType,
      r.weightKg ?? "",
      r.reps ?? "",
      r.rpe ?? "",
      r.isPr ? "si" : "no",
      r.failed ? "si" : "no",
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

/**
 * Restaura un dump (mismo formato de `buildUserDataDump`) reemplazando
 * TODO lo que el usuario tenía — pensado para el caso "reinstalé el
 * server y quiero volver de un backup", no para mergear datos. La UI que
 * llama esto exige escribir una confirmación antes de habilitar el botón.
 * Reutiliza los ids originales del dump (son uuid v7, generados con
 * suficiente entropía para no chocar) para no tener que remapear
 * referencias entre rutinas/días/ejercicios/series a mano.
 */
export async function restoreUserDataDump(
  db: Database,
  userId: string,
  dump: UserDataDump,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(routines).where(eq(routines.userId, userId));
    await tx.delete(workoutSessions).where(eq(workoutSessions.userId, userId));
    await tx.delete(personalRecords).where(eq(personalRecords.userId, userId));
    await tx.delete(bodyMetrics).where(eq(bodyMetrics.userId, userId));
    await tx.delete(plateInventory).where(eq(plateInventory.userId, userId));
    await tx.delete(userSettings).where(eq(userSettings.userId, userId));

    for (const routine of dump.routines) {
      const { days, ...routineFields } = routine;
      await tx.insert(routines).values({ ...routineFields, userId });
      for (const day of days) {
        const { exercises: dayExercises, ...dayFields } = day;
        await tx.insert(routineDays).values(dayFields);
        for (const exercise of dayExercises) {
          const { sets, ...exerciseFields } = exercise;
          await tx.insert(routineExercises).values(exerciseFields);
          if (sets.length > 0) await tx.insert(routineSets).values(sets);
        }
      }
    }

    for (const session of dump.sessions) {
      const { sets, ...sessionFields } = session;
      await tx.insert(workoutSessions).values({ ...sessionFields, userId });
      if (sets.length > 0) await tx.insert(setLogs).values(sets);
    }

    if (dump.personalRecords.length > 0) {
      await tx
        .insert(personalRecords)
        .values(dump.personalRecords.map((pr) => ({ ...pr, userId })));
    }
    if (dump.bodyMetrics.length > 0) {
      await tx
        .insert(bodyMetrics)
        .values(dump.bodyMetrics.map((m) => ({ ...m, userId })));
    }
    if (dump.plateInventory) {
      await tx.insert(plateInventory).values({ ...dump.plateInventory, userId });
    }
    if (dump.userSettings) {
      await tx.insert(userSettings).values({ ...dump.userSettings, userId });
    }
  });
}
