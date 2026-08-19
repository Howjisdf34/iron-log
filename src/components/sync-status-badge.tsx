"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb } from "@/lib/offline/db";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";

/** Indicador permanente y sutil: online/offline/N cambios pendientes (CLAUDE.md §5.5). */
export function SyncStatusBadge() {
  const isOnline = useOnlineStatus();
  const pendingCount = useLiveQuery(() => offlineDb.outbox.count(), [], 0) ?? 0;

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      role="status"
      className="fixed top-2 left-2 z-40 rounded-full border border-border bg-popover/95 px-3 py-1 text-xs text-muted-foreground shadow-md backdrop-blur"
    >
      {!isOnline ? "Sin conexión" : null}
      {!isOnline && pendingCount > 0 ? " · " : null}
      {pendingCount > 0
        ? `${pendingCount} cambio${pendingCount === 1 ? "" : "s"} pendiente${pendingCount === 1 ? "" : "s"}`
        : null}
    </div>
  );
}
