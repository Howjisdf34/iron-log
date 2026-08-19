"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RegisterServiceWorker } from "@/components/register-service-worker";
import { useOutboxSync } from "@/lib/offline/use-outbox-sync";

// Dexie (IndexedDB) es peso muerto en el "first load JS" de páginas que
// no tocan el outbox offline (p. ej. /login) — se carga en un chunk
// aparte, después de hidratar, no bloqueando el presupuesto de bundle
// del Workout Player (CLAUDE.md §7). Ver ADR-022.
const SyncStatusBadge = dynamic(
  () => import("@/components/sync-status-badge").then((m) => m.SyncStatusBadge),
  { ssr: false },
);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  useOutboxSync();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <SyncStatusBadge />
      <RegisterServiceWorker />
    </QueryClientProvider>
  );
}
