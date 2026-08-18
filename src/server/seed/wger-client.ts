import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import type {
  WgerEquipmentRef,
  WgerExerciseInfo,
  WgerLicense,
  WgerMuscleRef,
  WgerPaginated,
} from "./wger-types";

const WGER_BASE = "https://wger.de/api/v2";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`wger ${res.status} ${res.statusText}: ${url}`);
  return res.json() as Promise<T>;
}

async function fetchAllPages<T>(
  firstUrl: string,
  onPage?: (n: number) => void,
): Promise<T[]> {
  const out: T[] = [];
  let url: string | null = firstUrl;
  let page = 0;
  while (url) {
    const data: WgerPaginated<T> = await fetchJson<WgerPaginated<T>>(url);
    out.push(...data.results);
    page += 1;
    onPage?.(page);
    url = data.next;
  }
  return out;
}

/**
 * Descarga todos los ejercicios de wger (paginado) y cachea el JSON crudo en
 * disco — reanudable: si el cache existe y no se pide `force`, no vuelve a
 * pegarle a la red. Ver docs/DATA-SOURCES.md sobre por qué se cachea.
 */
export async function fetchAllWgerExercises(
  cachePath: string,
  force = false,
): Promise<WgerExerciseInfo[]> {
  if (!force && existsSync(cachePath)) {
    console.log(`[wger] usando cache: ${cachePath}`);
    return JSON.parse(await readFile(cachePath, "utf-8")) as WgerExerciseInfo[];
  }

  console.log("[wger] descargando exerciseinfo (paginado)...");
  const results = await fetchAllPages<WgerExerciseInfo>(
    `${WGER_BASE}/exerciseinfo/?format=json&limit=100`,
    (n) => process.stdout.write(`\r[wger] página ${n}...`),
  );
  process.stdout.write("\n");
  console.log(`[wger] ${results.length} ejercicios descargados`);

  await writeFile(cachePath, JSON.stringify(results, null, 2), "utf-8");
  return results;
}

export async function fetchWgerLicenses(): Promise<Map<number, WgerLicense>> {
  const data = await fetchAllPages<WgerLicense>(
    `${WGER_BASE}/license/?format=json&limit=50`,
  );
  return new Map(data.map((l) => [l.id, l]));
}

export async function fetchWgerMuscles(): Promise<WgerMuscleRef[]> {
  return fetchAllPages<WgerMuscleRef>(`${WGER_BASE}/muscle/?format=json&limit=50`);
}

export async function fetchWgerEquipment(): Promise<WgerEquipmentRef[]> {
  return fetchAllPages<WgerEquipmentRef>(`${WGER_BASE}/equipment/?format=json&limit=50`);
}
