"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { setTokenResolver } from "@/lib/api-client";

/**
 * Bridges Clerk's `useAuth().getToken()` (only callable from a React tree)
 * into the imperative `api` singleton used by every React Query hook.
 * Mount once near the root, inside ClerkProvider.
 */
export function ApiTokenSync() {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    setTokenResolver(() => getToken());
    return () => setTokenResolver(null);
  }, [getToken, isLoaded]);

  return null;
}
