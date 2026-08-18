import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./index";

/**
 * Corre `drizzle/*.sql` contra la DB. Se invoca desde src/instrumentation.ts
 * al arrancar el server — no desde entrypoint.sh (ver docs/ARCHITECTURE.md
 * ADR-008: drizzle-kit es devDependency y no sobrevive el output tracing
 * de `next build --standalone`, así que se usa el migrator programático de
 * drizzle-orm, que sí es una dependencia de producción).
 *
 * Advisory lock de Postgres en vez de un lock de archivo: protege contra
 * carreras reales entre procesos/contenedores que compartan la misma DB
 * (un lock en /tmp sólo protegería dentro de un mismo contenedor).
 */
const MIGRATION_LOCK_KEY = BigInt(84_722_608); // arbitrario, sólo debe ser estable

export async function runMigrations(): Promise<void> {
  const client = await db.$client.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    await migrate(db, { migrationsFolder: "./drizzle" });
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]);
    client.release();
  }
}
