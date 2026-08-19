"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SyncStatusBadge } from "@/components/sync-status-badge";
import { RegisterServiceWorker } from "@/components/register-service-worker";
import { useOutboxSync } from "@/lib/offline/use-outbox-sync";

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
