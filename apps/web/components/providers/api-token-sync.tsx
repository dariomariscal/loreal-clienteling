"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { setTokenResolver } from "@/lib/api-client";

/**
 * Bridges Clerk's `useAuth().getToken()` (only callable from a React tree)
 * into the imperative `api` singleton used by every React Query hook.
 *
 * The resolver is installed ONCE on mount and reads from a ref, so Clerk's
 * ~60s session token refresh — which gives back a new `getToken` reference —
 * doesn't re-run the effect or invalidate React Query caches.
 */
export function ApiTokenSync() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    setTokenResolver(() => getTokenRef.current());
    return () => setTokenResolver(null);
  }, []);

  return null;
}
