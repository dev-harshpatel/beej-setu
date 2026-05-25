"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RealtimeProvider } from "@/contexts/realtime-context";
import { RealtimeInvalidationBridge } from "@/hooks/use-realtime-invalidation";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 30 s; realtime invalidation overrides this
        // for the tables we subscribe to.
        staleTime: 30_000,
        // Show previous page data while fetching next page (no loading flicker)
        placeholderData: (prev: unknown) => prev,
        retry: 1,
      },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  // useState ensures a single QueryClient instance per component mount,
  // compatible with React 19 concurrent rendering.
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>
        {/* Headless bridge: watches version counters, calls invalidateQueries */}
        <RealtimeInvalidationBridge />
        {children}
      </RealtimeProvider>
    </QueryClientProvider>
  );
}
