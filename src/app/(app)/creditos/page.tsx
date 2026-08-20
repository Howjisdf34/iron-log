import { sql } from "drizzle-orm";
import { db } from "@/db";
import { exerciseMedia } from "@/db/schema";

export const metadata = { title: "Créditos — Iron Log" };
// Sin esto, Next intenta pre-renderizar esta página en build time (necesita
// DB) — el builder de Docker no tiene DATABASE_URL ni red hacia Postgres.
// Ver docs/ARCHITECTURE.md ADR-011.
export const dynamic = "force-dynamic";

interface AttributionRow {
  attribution: string | null;
  license: string | null;
  count: number;
}

async function getAttributions(): Promise<AttributionRow[]> {
  const rows = await db
    .select({
      attribution: exerciseMedia.attribution,
      license: exerciseMedia.license,
      count: sql<number>`count(*)::int`,
    })
    .from(exerciseMedia)
    .where(sql`${exerciseMedia.attribution} is not null`)
    .groupBy(exerciseMedia.attribution, exerciseMedia.license)
    .orderBy(sql`count(*) desc`);
  return rows;
}

export default async function CreditosPage() {
  const attributions = await getAttributions();
  const wgerRows = attributions.filter((a) => a.attribution?.includes("wger.de"));
  const feDbRows = attributions.filter((a) =>
    a.attribution?.includes("free-exercise-db"),
  );

  return (
    <main className="mx-auto max-w-2xl space-y-10 p-6 pb-24">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Créditos</h1>
        <p className="text-sm text-muted-foreground">
          El catálogo de ejercicios de Iron Log se construye a partir de datos y media de
          terceros, con licencias abiertas. Esta página cumple la atribución que exigen
          esas licencias.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">wger.de</h2>
        <p className="text-sm text-muted-foreground">
          Nombres, traducciones al español, músculos, equipo y videos de demostración.
          Licencia{" "}
          <a
            className="text-primary underline"
            href="https://creativecommons.org/licenses/by-sa/4.0/deed.es"
            target="_blank"
            rel="noopener noreferrer"
          >
            Creative Commons Attribution-ShareAlike 4.0
          </a>
          .{" "}
          <a
            className="text-primary underline"
            href="https://wger.de"
            target="_blank"
            rel="noopener noreferrer"
          >
            wger.de
          </a>
        </p>
        {wgerRows.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-card text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Autor</th>
                  <th className="px-3 py-2 font-medium">Licencia</th>
                  <th className="px-3 py-2 font-medium">Clips</th>
                </tr>
              </thead>
              <tbody>
                {wgerRows.map((row) => (
                  <tr
                    key={`${row.attribution}-${row.license}`}
                    className="border-t border-border"
                  >
                    <td className="px-3 py-2 text-foreground">{row.attribution}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.license}</td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {row.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Catálogo aún no poblado — corre{" "}
            <code className="font-mono">pnpm seed:exercises</code>.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">free-exercise-db</h2>
        <p className="text-sm text-muted-foreground">
          Instrucciones e imágenes de respaldo para ejercicios sin video. Dominio público
          (Unlicense).{" "}
          <a
            className="text-primary underline"
            href="https://github.com/yuhonas/free-exercise-db"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/yuhonas/free-exercise-db
          </a>
        </p>
        {feDbRows.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {feDbRows.reduce((sum, r) => sum + r.count, 0)} ejercicios usan imágenes de
            esta fuente.
          </p>
        ) : null}
      </section>
    </main>
  );
}
