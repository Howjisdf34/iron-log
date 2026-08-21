import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { requireUserId } from "@/server/auth/session";
import { getOrCreatePlateInventoryForUser } from "@/server/db/plate-inventory";
import { DiscosClient } from "./discos-client";

export const metadata = { title: "Calculadora de discos — Iron Log" };
export const dynamic = "force-dynamic"; // ver docs/ARCHITECTURE.md ADR-011

export default async function DiscosPage() {
  const userId = await requireUserId();
  const inventory = await getOrCreatePlateInventoryForUser(db, userId);

  return (
    <main className="mx-auto max-w-2xl px-[22px] pt-[18px] pb-[30px]">
      <Link
        href="/perfil"
        className="mb-4 flex items-center gap-1.5 text-[15px] font-semibold text-foreground"
      >
        <ArrowLeft className="size-4" /> Calculadora de discos
      </Link>
      <DiscosClient inventory={inventory} />
    </main>
  );
}
