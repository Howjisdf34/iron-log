import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import {
  FREE_EXERCISE_DB_JSON_URL,
  type FreeExerciseDbEntry,
} from "./free-exercise-db-types";

export async function fetchFreeExerciseDb(
  cachePath: string,
  force = false,
): Promise<FreeExerciseDbEntry[]> {
  if (!force && existsSync(cachePath)) {
    console.log(`[free-exercise-db] usando cache: ${cachePath}`);
    return JSON.parse(await readFile(cachePath, "utf-8")) as FreeExerciseDbEntry[];
  }

  console.log("[free-exercise-db] descargando dataset...");
  const res = await fetch(FREE_EXERCISE_DB_JSON_URL);
  if (!res.ok) throw new Error(`free-exercise-db ${res.status} ${res.statusText}`);
  const data = (await res.json()) as FreeExerciseDbEntry[];
  console.log(`[free-exercise-db] ${data.length} ejercicios descargados`);

  await writeFile(cachePath, JSON.stringify(data, null, 2), "utf-8");
  return data;
}

/** Normaliza un nombre para matching difuso simple (sin libs de distancia). */
export function normalizeNameForMatch(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function buildFreeExerciseDbIndex(
  entries: FreeExerciseDbEntry[],
): Map<string, FreeExerciseDbEntry> {
  const index = new Map<string, FreeExerciseDbEntry>();
  for (const entry of entries) {
    const key = normalizeNameForMatch(entry.name);
    if (!index.has(key)) index.set(key, entry);
  }
  return index;
}
