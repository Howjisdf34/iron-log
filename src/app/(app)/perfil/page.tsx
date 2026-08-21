import Link from "next/link";
import { ChevronRight, LogOut, Ruler, TrendingUp, Weight } from "lucide-react";
import { auth } from "@/server/auth";
import { logoutAction } from "@/server/actions/auth";
import { db } from "@/db";
import { getTrainingOverviewForUser } from "@/server/history/overview";
import { listBodyMetricsForUser } from "@/server/db/body-metrics";
import { listPersonalRecordsForUser } from "@/server/db/personal-records";
import { getOrCreateUserSettingsForUser } from "@/server/db/user-settings";
import { ExportImportPanel } from "@/components/history/export-import-panel";
import { ThemeToggle } from "./theme-toggle";

export const metadata = { title: "Perfil — Iron Log" };
export const dynamic = "force-dynamic"; // ver docs/ARCHITECTURE.md ADR-011

function NavRow({ href, label, value }: { href: string; label: string; value?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between border-b border-border py-[18px] last:border-b-0"
    >
      <span className="text-base font-medium text-foreground">{label}</span>
      <span className="flex items-center gap-1.5 text-[14px] text-muted-foreground">
        {value}
        <ChevronRight className="size-4" />
      </span>
    </Link>
  );
}

export default async function PerfilPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [overview, bodyMetrics, prs, settings] = await Promise.all([
    getTrainingOverviewForUser(db, userId),
    listBodyMetricsForUser(db, userId, 1),
    listPersonalRecordsForUser(db, userId),
    getOrCreateUserSettingsForUser(db, userId),
  ]);

  const latestWeight = bodyMetrics[0]?.weightKg;

  return (
    <main className="mx-auto max-w-2xl px-[22px] pt-[18px] pb-[30px]">
      <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-foreground">
        {session?.user?.name ?? "Perfil"}
      </h1>
      <p className="text-[14px] text-muted-foreground">{session?.user?.email}</p>

      <section className="mt-6 grid grid-cols-3 gap-x-px overflow-hidden rounded-2xl bg-border">
        <div className="flex flex-col items-center gap-1 bg-background py-3">
          <Weight className="size-4 text-muted-foreground" />
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {latestWeight != null ? Number(latestWeight) : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground uppercase">Peso</p>
        </div>
        <div className="flex flex-col items-center gap-1 bg-background py-3">
          <TrendingUp className="size-4 text-muted-foreground" />
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {overview.streak.current}
          </p>
          <p className="text-[11px] text-muted-foreground uppercase">Racha</p>
        </div>
        <div className="flex flex-col items-center gap-1 bg-background py-3">
          <Ruler className="size-4 text-muted-foreground" />
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {prs.length}
          </p>
          <p className="text-[11px] text-muted-foreground uppercase">PRs</p>
        </div>
      </section>

      <section className="mt-8">
        <NavRow href="/historial" label="Progreso" />
        <NavRow
          href="/cuerpo"
          label="Medidas corporales"
          value={latestWeight != null ? `${Number(latestWeight)} kg` : undefined}
        />
        <NavRow href="/perfil/discos" label="Calculadora de discos" />
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
          Datos y respaldo
        </h2>
        <ExportImportPanel />
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
          Apariencia
        </h2>
        <ThemeToggle theme={settings.theme} />
      </section>

      <form action={logoutAction} className="mt-8">
        <button
          type="submit"
          className="flex w-full items-center gap-2 border-t border-border py-[18px] text-base font-medium text-destructive"
        >
          <LogOut className="size-4" /> Cerrar sesión
        </button>
      </form>
    </main>
  );
}
