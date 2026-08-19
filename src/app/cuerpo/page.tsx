import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { requireUserId } from "@/server/auth/session";
import { listBodyMetricsForUser } from "@/server/db/body-metrics";
import { BodyMetricsPanel } from "@/components/body-metrics/body-metrics-panel";

export const metadata = { title: "Peso corporal — Iron Log" };
export const dynamic = "force-dynamic"; // ver docs/ARCHITECTURE.md ADR-011

export default async function CuerpoPage() {
  const userId = await requireUserId();
  const metrics = await listBodyMetricsForUser(db, userId);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6 pb-24">
      <Link
        href="/historial"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Historial
      </Link>
      <h1 className="text-2xl font-bold text-foreground">Peso corporal</h1>
      <BodyMetricsPanel metrics={metrics} />
    </main>
  );
}
