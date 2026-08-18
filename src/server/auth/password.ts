import { hash, verify } from "@node-rs/argon2";

/**
 * Parámetros recomendados por OWASP para Argon2id (m=19MiB, t=2, p=1) —
 * balance razonable de costo/seguridad para un VPS de 2 vCPU / 4GB RAM.
 * Ver docs/ARCHITECTURE.md ADR-004 sobre por qué @node-rs/argon2.
 */
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

export function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  return verify(hashed, plain).catch(() => false);
}
