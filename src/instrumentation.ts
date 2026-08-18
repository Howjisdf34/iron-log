/**
 * Hook de arranque de Next.js — corre una vez, antes de servir tráfico.
 * Ver docs/ARCHITECTURE.md ADR-008.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { runMigrations } = await import("./db/migrate");
  await runMigrations();

  const { seedUsersIfNeeded } = await import("./server/auth/seed-users");
  await seedUsersIfNeeded();
}
