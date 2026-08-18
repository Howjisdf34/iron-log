import { eq } from "drizzle-orm";
import type { Database } from "@/db";
import {
  equipment,
  exerciseAliases,
  exerciseMedia,
  exercises,
  muscles,
} from "@/db/schema";
import { EQUIPMENT_ES_BY_WGER_ID } from "./translations/equipment-es";
import { MUSCLE_ES_BY_WGER_ID } from "./translations/muscles-es";
import type { WgerMuscleRef } from "./wger-types";
import type { NormalizedExercise } from "./normalize";
import type { MediaDescriptor } from "./media-pipeline";

/** Upsert de los catálogos chicos (12 equipos, 15 músculos) — corre una vez por seed. */
export async function upsertCatalogs(
  db: Database,
  wgerMuscles: WgerMuscleRef[],
): Promise<{ equipmentBySlug: Map<string, string>; muscleBySlug: Map<string, string> }> {
  for (const [id, es] of Object.entries(EQUIPMENT_ES_BY_WGER_ID)) {
    await db
      .insert(equipment)
      .values({ slug: es.slug, nameEs: es.nameEs, nameEn: `wger-equipment-${id}` })
      .onConflictDoUpdate({ target: equipment.slug, set: { nameEs: es.nameEs } });
  }

  for (const wm of wgerMuscles) {
    const es = MUSCLE_ES_BY_WGER_ID[wm.id];
    if (!es) continue;
    await db
      .insert(muscles)
      .values({ slug: es.slug, nameEs: es.nameEs, nameEn: wm.name, isFront: wm.is_front })
      .onConflictDoUpdate({
        target: muscles.slug,
        set: { nameEs: es.nameEs, nameEn: wm.name, isFront: wm.is_front },
      });
  }

  const equipmentRows = await db.select().from(equipment);
  const muscleRows = await db.select().from(muscles);
  return {
    equipmentBySlug: new Map(equipmentRows.map((r) => [r.slug, r.id])),
    muscleBySlug: new Map(muscleRows.map((r) => [r.slug, r.id])),
  };
}

export async function upsertExercise(
  db: Database,
  normalized: NormalizedExercise,
  media: MediaDescriptor[],
  lookup: { equipmentBySlug: Map<string, string>; muscleBySlug: Map<string, string> },
): Promise<void> {
  const equipmentId = normalized.equipmentSlug
    ? (lookup.equipmentBySlug.get(normalized.equipmentSlug) ?? null)
    : null;
  const primaryMuscles = normalized.primaryMuscleSlugs
    .map((s) => lookup.muscleBySlug.get(s))
    .filter((id): id is string => Boolean(id));
  const secondaryMuscles = normalized.secondaryMuscleSlugs
    .map((s) => lookup.muscleBySlug.get(s))
    .filter((id): id is string => Boolean(id));

  const [row] = await db
    .insert(exercises)
    .values({
      slug: normalized.slug,
      nameEs: normalized.nameEs,
      nameEn: normalized.nameEn,
      category: normalized.category,
      force: normalized.force,
      mechanic: normalized.mechanic,
      level: normalized.level,
      equipmentId,
      primaryMuscles,
      secondaryMuscles,
      instructionsEs: normalized.instructionsEs,
      defaultRestSeconds: normalized.defaultRestSeconds,
      isUnilateral: normalized.isUnilateral,
      tracksWeight: normalized.tracksWeight,
      tracksReps: normalized.tracksReps,
      tracksTime: normalized.tracksTime,
      tracksDistance: normalized.tracksDistance,
      source: normalized.source,
      sourceId: normalized.sourceId,
      needsTranslation: normalized.needsTranslation,
      licenseNote: normalized.licenseNote,
    })
    .onConflictDoUpdate({
      target: exercises.slug,
      set: {
        nameEs: normalized.nameEs,
        nameEn: normalized.nameEn,
        category: normalized.category,
        force: normalized.force,
        mechanic: normalized.mechanic,
        level: normalized.level,
        equipmentId,
        primaryMuscles,
        secondaryMuscles,
        instructionsEs: normalized.instructionsEs,
        defaultRestSeconds: normalized.defaultRestSeconds,
        isUnilateral: normalized.isUnilateral,
        tracksWeight: normalized.tracksWeight,
        tracksReps: normalized.tracksReps,
        tracksTime: normalized.tracksTime,
        tracksDistance: normalized.tracksDistance,
        needsTranslation: normalized.needsTranslation,
        licenseNote: normalized.licenseNote,
        updatedAt: new Date(),
      },
    })
    .returning({ id: exercises.id });

  const exerciseId = row!.id;

  // Reemplaza media y aliases enteros — más simple que llevar una clave de
  // conflicto por fila hija, y el seed es la única fuente de estos datos.
  await db.delete(exerciseMedia).where(eq(exerciseMedia.exerciseId, exerciseId));
  if (media.length > 0) {
    await db.insert(exerciseMedia).values(
      media.map((m) => ({
        exerciseId,
        type: m.type,
        localPath: m.localPath,
        originalUrl: m.originalUrl,
        posterPath: m.posterPath,
        durationMs: m.durationMs,
        attribution: m.attribution,
        license: m.license,
        isPrimary: m.isPrimary,
      })),
    );
  }

  await db.delete(exerciseAliases).where(eq(exerciseAliases.exerciseId, exerciseId));
  const uniqueAliases = [...new Set(normalized.aliases)].filter(
    (a) => a.toLowerCase() !== normalized.nameEs.toLowerCase(),
  );
  if (uniqueAliases.length > 0) {
    await db
      .insert(exerciseAliases)
      .values(uniqueAliases.map((alias) => ({ exerciseId, alias })));
  }
}
