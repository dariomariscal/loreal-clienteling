"use client";

import { QueryClient, QueryClientProvider, isServer } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Treat cached data as fresh for 5 minutes — navigating back into a
        // page hits cache and renders instantly while React Query refetches
        // in the background. Mutations invalidate via invalidateQueries.
        staleTime: 5 * 60 * 1000,
        // Keep inactive query data around for 30 min so cross-page nav
        // never falls back to a skeleton.
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 2,
      },
    },
  });
}

// Canonical TanStack pattern: request-scoped on server, browser-singleton on
// client. Without this, a re-render in the layout can spawn a fresh
// QueryClient and wipe the cache — which is exactly the "skeleton on every
// navigation" symptom paired with Clerk's 60s session token refresh.
let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (isServer) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
