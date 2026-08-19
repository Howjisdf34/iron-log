import { NextResponse } from "next/server";
import { db } from "@/db";
import { requireUserId } from "@/server/auth/session";
import { buildSetLogsCsv, buildUserDataDump } from "@/server/export/dump";

/** "Mis datos son míos" (CLAUDE.md §5.4) — export completo a JSON o CSV plano de series. */
export async function GET(request: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const format =
    new URL(request.url).searchParams.get("format") === "csv" ? "csv" : "json";
  const today = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const csv = await buildSetLogsCsv(db, userId);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="iron-log-series-${today}.csv"`,
      },
    });
  }

  const dump = await buildUserDataDump(db, userId);
  return new NextResponse(JSON.stringify(dump, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="iron-log-backup-${today}.json"`,
    },
  });
}
