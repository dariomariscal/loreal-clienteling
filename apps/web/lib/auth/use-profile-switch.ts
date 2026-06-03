"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useSessionList, useSignIn } from "@clerk/nextjs";
import { homeForRole } from "@/lib/auth/home-for-role";
import type { DemoProfile } from "@/lib/auth/demo-profiles";

/**
 * Streaming-style profile swap (Netflix-like "who's watching" picker).
 *
 * Built on Clerk v7's Future API (Core 3 signals). Two paths depending on
 * whether the picked profile already has a cached session on this client:
 *
 *   1. **Existing session** — pull `setActive` from `useSessionList()` and
 *      flip the active session in place. Instant, no network round trip.
 *   2. **First-time pick** — call `signIn.password({ identifier, password })`
 *      then `signIn.finalize({ navigate })`. v7's `finalize` is what
 *      "promotes" a completed sign-in to the active session — the equivalent
 *      of v6's `setActive({ session: createdSessionId })`.
 *
 * Multi-session must be enabled in the Clerk Dashboard
 * (Configure → Sessions → Multi-session handling) so a fresh `signIn`
 * adds a session alongside the active one instead of erroring with
 * `session_exists`.
 *
 * References:
 *   - https://clerk.com/docs/guides/development/custom-flows/authentication/multi-session-applications
 *   - https://clerk.com/changelog/2026-03-03-core-3
 */
export function useProfileSwitch() {
  const router = useRouter();
  const { client } = useClerk();
  const { signIn } = useSignIn();
  const sessionList = useSessionList();
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isReady = sessionList.isLoaded;

  async function switchTo(profile: DemoProfile) {
    if (!isReady || switchingTo) return;

    setError(null);
    setSwitchingTo(profile.email);

    try {
      const destination = homeForRole(profile.role);
      const existingSessionId = findSessionIdByEmail(client, profile.email);

      if (existingSessionId) {
        // Hot path: profile is already cached on the client. Flip the active
        // session in place — Clerk's setActive accepts a navigate callback
        // that fires once the new cookie is fully propagated, which is the
        // piece that prevents the "stuck on loading" race we hit in v6.
        await sessionList.setActive({
          session: existingSessionId,
          navigate: async () => {
            router.replace(destination);
          },
        });
        return;
      }

      // Cold path: authenticate from scratch. `signIn.password` populates
      // the SignInFuture resource; check its status before finalizing.
      const passwordResult = await signIn.password({
        identifier: profile.email,
        password: profile.password,
      });
      if (passwordResult.error) {
        setError("No se pudo cambiar de perfil. Intenta de nuevo.");
        setSwitchingTo(null);
        return;
      }
      if (signIn.status !== "complete") {
        setError(`Estado inesperado: ${signIn.status}`);
        setSwitchingTo(null);
        return;
      }

      // `finalize` is v7's "make this sign-in the active session". Its
      // navigate callback runs after the session cookie is in place.
      const finalizeResult = await signIn.finalize({
        navigate: async () => {
          router.replace(destination);
        },
      });
      if (finalizeResult.error) {
        setError("No se pudo cambiar de perfil. Intenta de nuevo.");
        setSwitchingTo(null);
        return;
      }
    } catch {
      setError("No se pudo cambiar de perfil. Intenta de nuevo.");
      setSwitchingTo(null);
    }
  }

  return { switchTo, switchingTo, error, isReady };
}

type ClerkClient = ReturnType<typeof useClerk>["client"];

function findSessionIdByEmail(
  client: ClerkClient,
  email: string,
): string | null {
  if (!client) return null;
  for (const session of client.sessions) {
    const match = session.user?.emailAddresses.some(
      (address) => address.emailAddress === email,
    );
    if (match) return session.id;
  }
  return null;
}
