import { htmlToInstructions } from "./html-to-instructions";
import { normalizeNameForMatch } from "./free-exercise-db-client";
import { EQUIPMENT_ES_BY_WGER_ID } from "./translations/equipment-es";
import { MUSCLE_ES_BY_WGER_ID } from "./translations/muscles-es";
import { slugify, uniqueSlug } from "./slugify";
import { WGER_LANGUAGE_ES, WGER_LANGUAGE_EN, type WgerExerciseInfo } from "./wger-types";
import type { FreeExerciseDbEntry } from "./free-exercise-db-types";

export type ExerciseCategory = "compound" | "isolation" | "cardio" | "mobility";

export interface NormalizedExercise {
  slug: string;
  nameEs: string;
  nameEn: string;
  category: ExerciseCategory;
  force: "push" | "pull" | "static" | null;
  mechanic: "compound" | "isolation" | null;
  level: "beginner" | "intermediate" | "expert" | null;
  equipmentSlug: string | null;
  primaryMuscleSlugs: string[];
  secondaryMuscleSlugs: string[];
  instructionsEs: string[];
  defaultRestSeconds: number;
  isUnilateral: boolean;
  tracksWeight: boolean;
  tracksReps: boolean;
  tracksTime: boolean;
  tracksDistance: boolean;
  source: "wger";
  sourceId: string;
  needsTranslation: boolean;
  aliases: string[];
  licenseNote: string | null;
  // Pistas para el pipeline de media — no se persisten tal cual.
  wgerVideoUrl: string | null;
  wgerVideoLicenseId: number | null;
  wgerVideoAuthor: string | null;
  freeExerciseImageUrls: [string, string] | null;
}

const UNILATERAL_HINTS = [
  "single",
  "unilateral",
  "one-arm",
  "one arm",
  "alternating",
  "each arm",
  "each leg",
  "single-leg",
  "single-arm",
];

function pickTranslation(exercise: WgerExerciseInfo) {
  const es = exercise.translations.find((t) => t.language === WGER_LANGUAGE_ES);
  const en = exercise.translations.find((t) => t.language === WGER_LANGUAGE_EN);
  const fallback = exercise.translations[0];

  const nameEn = en?.name ?? fallback?.name ?? `Exercise ${exercise.id}`;
  const nameEs = es?.name ?? nameEn;
  const instructionsSource =
    es?.description || en?.description || fallback?.description || "";
  const needsTranslation = !es;
  const aliases = [...(es?.aliases ?? []), ...(en?.aliases ?? [])].map((a) => a.alias);

  return {
    nameEs,
    nameEn,
    instructionsEs: htmlToInstructions(instructionsSource),
    needsTranslation,
    aliases,
  };
}

/**
 * Nuestro `category` (compound/isolation/cardio/mobility) no existe tal
 * cual en ninguna fuente: la `category` de wger es grupo muscular
 * (Abs/Arms/Back/...), y la de free-exercise-db es un tipo de disciplina
 * (strength/stretching/powerlifting/...). Se deriva con esta heurística
 * documentada — no es un campo verificado 1:1, es una clasificación de
 * producto. Ver docs/DATA-SOURCES.md.
 */
function mapCategory(
  wgerCategoryName: string,
  feMatch: FreeExerciseDbEntry | undefined,
): ExerciseCategory {
  if (wgerCategoryName === "Cardio") return "cardio";
  if (feMatch?.category === "cardio") return "cardio";
  if (feMatch?.category === "stretching") return "mobility";
  if (feMatch?.mechanic === "isolation") return "isolation";
  return "compound";
}

function tracksFor(category: ExerciseCategory) {
  if (category === "cardio") {
    return {
      tracksWeight: false,
      tracksReps: false,
      tracksTime: true,
      tracksDistance: true,
    };
  }
  if (category === "mobility") {
    return {
      tracksWeight: false,
      tracksReps: true,
      tracksTime: true,
      tracksDistance: false,
    };
  }
  return {
    tracksWeight: true,
    tracksReps: true,
    tracksTime: false,
    tracksDistance: false,
  };
}

function defaultRestFor(category: ExerciseCategory): number {
  switch (category) {
    case "compound":
      return 120;
    case "isolation":
      return 90;
    case "cardio":
      return 60;
    case "mobility":
      return 30;
  }
}

export function normalizeExercise(
  exercise: WgerExerciseInfo,
  feDbIndex: Map<string, FreeExerciseDbEntry>,
  takenSlugs: Set<string>,
): NormalizedExercise {
  const { nameEs, nameEn, instructionsEs, needsTranslation, aliases } =
    pickTranslation(exercise);

  const feMatch = feDbIndex.get(normalizeNameForMatch(nameEn));
  const category = mapCategory(exercise.category.name, feMatch);
  const tracks = tracksFor(category);

  const baseSlug = slugify(nameEn);
  const slug = uniqueSlug(baseSlug, takenSlugs, exercise.uuid);
  takenSlugs.add(slug);

  const primaryMuscleSlugs = exercise.muscles
    .map((m) => MUSCLE_ES_BY_WGER_ID[m.id]?.slug)
    .filter((s): s is string => Boolean(s));
  const secondaryMuscleSlugs = exercise.muscles_secondary
    .map((m) => MUSCLE_ES_BY_WGER_ID[m.id]?.slug)
    .filter((s): s is string => Boolean(s));

  const equipmentId = exercise.equipment[0]?.id;
  const equipmentSlug = equipmentId
    ? (EQUIPMENT_ES_BY_WGER_ID[equipmentId]?.slug ?? null)
    : null;

  const nameLower = nameEn.toLowerCase();
  const isUnilateral = UNILATERAL_HINTS.some((hint) => nameLower.includes(hint));

  const mainVideo = exercise.videos.find((v) => v.is_main) ?? exercise.videos[0];

  const freeExerciseImageUrls: [string, string] | null =
    feMatch && feMatch.images.length >= 2
      ? [feMatch.images[0]!, feMatch.images[1]!]
      : null;

  return {
    slug,
    nameEs,
    nameEn,
    category,
    force: feMatch?.force ?? null,
    mechanic: feMatch?.mechanic ?? null,
    level: feMatch?.level ?? null,
    equipmentSlug,
    primaryMuscleSlugs,
    secondaryMuscleSlugs,
    instructionsEs,
    defaultRestSeconds: defaultRestFor(category),
    isUnilateral,
    ...tracks,
    source: "wger",
    sourceId: exercise.uuid,
    needsTranslation,
    aliases,
    licenseNote: exercise.license?.short_name ?? null,
    wgerVideoUrl: mainVideo?.video ?? null,
    wgerVideoLicenseId: mainVideo?.license ?? null,
    wgerVideoAuthor: mainVideo?.license_author ?? null,
    freeExerciseImageUrls,
  };
}
