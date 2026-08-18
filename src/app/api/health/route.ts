import { NextResponse } from "next/server";
import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";

const { version } = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf-8"),
) as { version: string };

// Un solo pool de conexión corta para el healthcheck, no el pool de la app
// (ese se define en Fase 1 junto al schema de Drizzle).
let healthPool: Pool | undefined;

async function checkDb(): Promise<"ok" | "error" | "not_configured"> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return "not_configured";

  healthPool ??= new Pool({ connectionString, max: 1 });

  try {
    await healthPool.query("SELECT 1");
    return "ok";
  } catch {
    return "error";
  }
}

export async function GET() {
  const db = await checkDb();
  const status = db === "error" ? "error" : "ok";

  return NextResponse.json(
    {
      status,
      uptime: process.uptime(),
      db,
      version,
    },
    { status: status === "ok" ? 200 : 503 },
  );
}
