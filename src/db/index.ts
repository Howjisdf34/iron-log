import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  var _ironLogPool: Pool | undefined;
}

// En dev, `next dev` recarga módulos en cada cambio — reusar el pool en
// `global` evita abrir una conexión nueva por hot-reload. Máx. 5 conexiones
// por proceso (§7 del brief: Postgres afinado para RAM baja en el VPS).
const pool =
  global._ironLogPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  global._ironLogPool = pool;
}

export const db = drizzle(pool, { schema });
export type Database = typeof db;
