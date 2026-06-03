"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useSignIn } from "@clerk/nextjs";
import { homeForRole } from "@/lib/auth/home-for-role";
import type { DemoProfile } from "@/lib/auth/demo-profiles";

/**
 * Streaming-style profile swap (Netflix-like "who's watching" picker).
 *
 * Requires multi-session handling to be enabled in the Clerk Dashboard
 * (Configure → Sessions → Multi-session handling). With that flag on, a new
 * `signIn.create` adds a session alongside the active one instead of
 * erroring with `session_exists`, and `setActive` swaps the active session
 * in place — no `signOut` round trip, no middleware-driven flash to
 * `/sign-in`.
 *
 * If we ever match an already-signed-in profile (sessions[].user.email),
 * we skip the sign-in step entirely and just call `setActive` with the
 * existing session id.
 *
 * Reference: https://clerk.com/docs/guides/development/custom-flows/authentication/multi-session-applications
 */
export function useProfileSwitch() {
  const router = useRouter();
  const { client } = useClerk();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function switchTo(profile: DemoProfile) {
    if (!isLoaded || switchingTo) return;

    setError(null);
    setSwitchingTo(profile.email);

    try {
      const destination = homeForRole(profile.role);

      // Reuse an existing session for this profile if one is already cached
      // on the client — avoids a needless network round trip.
      const existingSessionId = findSessionIdByEmail(client, profile.email);

      const sessionId =
        existingSessionId ??
        (await createSessionForProfile(signIn, profile));

      if (!sessionId) {
        setError("No se pudo cambiar de perfil. Intenta de nuevo.");
        setSwitchingTo(null);
        return;
      }

      await setActive({
        session: sessionId,
        navigate: async () => {
          // Replace (not push) so the previous role's URL doesn't survive in
          // history and a Back press lands the user on the correct shell.
          router.replace(destination);
        },
      });
    } catch {
      setError("No se pudo cambiar de perfil. Intenta de nuevo.");
      setSwitchingTo(null);
    }
  }

  return { switchTo, switchingTo, error, isReady: isLoaded };
}

type ClerkClient = ReturnType<typeof useClerk>["client"];
type SignInResource = ReturnType<typeof useSignIn>["signIn"];

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

async function createSessionForProfile(
  signIn: SignInResource,
  profile: DemoProfile,
): Promise<string | null> {
  if (!signIn) return null;
  const attempt = await signIn.create({
    strategy: "password",
    identifier: profile.email,
    password: profile.password,
  });
  if (attempt.status !== "complete") return null;
  return attempt.createdSessionId;
}
