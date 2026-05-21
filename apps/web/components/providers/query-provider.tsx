"use client";

import { useEffect, useRef } from "react";
import {
  QueryClient,
  QueryClientProvider,
  isServer,
} from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

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
    <QueryClientProvider client={queryClient}>
      <CacheResetOnUserChange />
      {children}
    </QueryClientProvider>
  );
}

// Safety net: the browser QueryClient is a singleton, so cached data from
// a previous Clerk session would leak into the next user's first paint.
// Watch the userId and wipe the cache whenever it changes.
function CacheResetOnUserChange() {
  const { isLoaded, userId } = useAuth();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;
    if (previousUserId.current === undefined) {
      previousUserId.current = userId ?? null;
      return;
    }
    if (previousUserId.current !== userId) {
      browserQueryClient?.clear();
      previousUserId.current = userId ?? null;
    }
  }, [isLoaded, userId]);

  return null;
}
