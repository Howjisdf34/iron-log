import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 60_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Descarga cacheada — si el archivo ya existe en disco, no vuelve a
 * pedirlo. Con ~80 videos de varios MB cada uno, timeouts transitorios de
 * red son esperables — reintenta antes de fallar el batch completo.
 */
export async function downloadCached(url: string, destPath: string): Promise<void> {
  if (existsSync(destPath)) return;

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) throw new Error(`GET ${res.status} ${res.statusText}: ${url}`);
      const buffer = Buffer.from(await res.arrayBuffer());

      await mkdir(dirname(destPath), { recursive: true });
      await writeFile(destPath, buffer);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await sleep(1000 * attempt);
    }
  }
  throw lastError;
}
