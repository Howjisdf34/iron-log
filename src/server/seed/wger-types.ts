/**
 * Shapes reales verificados con curl (ver docs/DATA-SOURCES.md), no
 * inventados. Sólo se tipan los campos que el pipeline realmente usa.
 */

export interface WgerMuscleRef {
  id: number;
  name: string;
  name_en: string;
  is_front: boolean;
}

export interface WgerEquipmentRef {
  id: number;
  name: string;
}

export interface WgerImage {
  id: number;
  image: string;
  is_main: boolean;
}

export interface WgerVideo {
  id: number;
  video: string;
  is_main: boolean;
  license: number;
  license_author: string;
}

export interface WgerAlias {
  alias: string;
}

export interface WgerTranslation {
  id: number;
  name: string;
  description: string;
  language: number;
  aliases: WgerAlias[];
}

export interface WgerExerciseInfo {
  id: number;
  uuid: string;
  category: { id: number; name: string };
  muscles: WgerMuscleRef[];
  muscles_secondary: WgerMuscleRef[];
  equipment: WgerEquipmentRef[];
  license: { id: number; short_name: string };
  license_author: string;
  images: WgerImage[];
  translations: WgerTranslation[];
  videos: WgerVideo[];
}

export interface WgerPaginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface WgerLicense {
  id: number;
  short_name: string;
  full_name: string;
  url: string;
}

/** language id -> código ISO. Verificado con GET /api/v2/language/. */
export const WGER_LANGUAGE_ES = 4;
export const WGER_LANGUAGE_EN = 2;
