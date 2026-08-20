import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireUserId } from "@/server/auth/session";
import { getRoutineWithDetails } from "@/server/db/routines";
import { RoutineEditorClient } from "./editor-client";

export const dynamic = "force-dynamic"; // ver docs/ARCHITECTURE.md ADR-011

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();
  const routine = await getRoutineWithDetails(db, userId, id);
  return { title: routine ? `${routine.name} — Iron Log` : "Rutina — Iron Log" };
}

export default async function RutinaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();
  const routine = await getRoutineWithDetails(db, userId, id);
  if (!routine) notFound();

  // key con los ids de días: fuerza remount (y reset de estado local de
  // orden) cuando se agrega/quita un día desde el server, sin useEffect.
  return (
    <RoutineEditorClient
      key={routine.days.map((d) => d.id).join(",")}
      routine={routine}
    />
  );
}
