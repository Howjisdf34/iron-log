import { and, eq, inArray, or, sql } from "drizzle-orm";
import type { Database } from "@/db";
import {
  equipment,
  exerciseAliases,
  exercises,
  muscles,
  type Exercise,
} from "@/db/schema";
import type { ExerciseSearchInput } from "@/lib/validation/routines";

/** Catálogo — no filtra por userId a propósito, es compartido/read-only. */
export async function searchExercises(
  db: Database,
  input: ExerciseSearchInput,
  limit = 40,
): Promise<Exercise[]> {
  const conditions = [];

  if (input.query) {
    const pattern = `%${input.query.toLowerCase()}%`;
    const matchingAliasExerciseIds = db
      .select({ id: exerciseAliases.exerciseId })
      .from(exerciseAliases)
      .where(sql`lower(${exerciseAliases.alias}) like ${pattern}`);
    conditions.push(
      or(
        sql`lower(${exercises.nameEs}) like ${pattern}`,
        sql`lower(${exercises.nameEn}) like ${pattern}`,
        inArray(exercises.id, matchingAliasExerciseIds),
      ),
    );
  }
  if (input.muscleSlug) {
    const [muscle] = await db
      .select({ id: muscles.id })
      .from(muscles)
      .where(eq(muscles.slug, input.muscleSlug))
      .limit(1);
    if (muscle) {
      conditions.push(
        or(
          sql`${muscle.id} = any(${exercises.primaryMuscles})`,
          sql`${muscle.id} = any(${exercises.secondaryMuscles})`,
        ),
      );
    } else {
      return []; // slug de músculo desconocido -> sin resultados, no error
    }
  }
  if (input.equipmentSlug) {
    const [equip] = await db
      .select({ id: equipment.id })
      .from(equipment)
      .where(eq(equipment.slug, input.equipmentSlug))
      .limit(1);
    if (equip) conditions.push(eq(exercises.equipmentId, equip.id));
    else return [];
  }
  if (input.level) conditions.push(eq(exercises.level, input.level));
  if (input.category) conditions.push(eq(exercises.category, input.category));

  return db
    .select()
    .from(exercises)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(exercises.nameEs)
    .limit(limit);
}

export async function getExerciseBySlug(
  db: Database,
  slug: string,
): Promise<Exercise | undefined> {
  const [row] = await db
    .select()
    .from(exercises)
    .where(eq(exercises.slug, slug))
    .limit(1);
  return row;
}

export async function getExercisesBySlugs(
  db: Database,
  slugs: string[],
): Promise<Map<string, Exercise>> {
  if (slugs.length === 0) return new Map();
  const rows = await db.select().from(exercises).where(inArray(exercises.slug, slugs));
  return new Map(rows.map((r) => [r.slug, r]));
}

export async function listMuscles(db: Database) {
  return db.select().from(muscles).orderBy(muscles.nameEs);
}

export async function listEquipment(db: Database) {
  return db.select().from(equipment).orderBy(equipment.nameEs);
}
