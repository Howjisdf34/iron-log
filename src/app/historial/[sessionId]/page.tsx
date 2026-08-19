import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { requireUserId } from "@/server/auth/session";
import { getSessionDetailForUser } from "@/server/db/history";
import { SessionDetailEditor } from "@/components/history/session-detail-editor";

export const dynamic = "force-dynamic"; // ver docs/ARCHITECTURE.md ADR-011

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const userId = await requireUserId();
  const session = await getSessionDetailForUser(db, userId, sessionId);
  if (!session) notFound();

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6 pb-24">
      <Link
        href="/historial"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Historial
      </Link>
      <SessionDetailEditor session={session} />
    </main>
  );
}
