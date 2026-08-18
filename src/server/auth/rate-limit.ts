/**
 * Rate limiting in-memory (sin Redis, ver CLAUDE.md §5.1). Válido porque
 * corremos un único contenedor sin escalado horizontal — el estado vive en
 * memoria del proceso y se pierde en cada restart, lo cual es aceptable
 * para este caso de uso (2 usuarios, no un SaaS público).
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

// Evita fuga de memoria indefinida — purga buckets viejos cada tanto.
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < WINDOW_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > WINDOW_MS) buckets.delete(key);
  }
}

/** @returns true si la key (típicamente `email:ip`) puede intentar login. */
export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= MAX_ATTEMPTS) return false;

  bucket.count += 1;
  return true;
}

/** Se llama tras un login exitoso para no penalizar intentos futuros legítimos. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
