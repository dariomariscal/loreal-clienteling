import { auth, currentUser } from "@clerk/nextjs/server";
import type { UserRole } from "@loreal/contracts";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  imageUrl: string | null;
  role: UserRole;
  storeId: string | null;
  zoneId: string | null;
  brandId: string | null;
  divisionId: string | null;
  specialty: string | null;
  active: boolean;
}

export interface Session {
  user: SessionUser;
}

/**
 * Returns the authenticated session pieced together from Clerk session claims
 * (cheap; available without an API call) and `currentUser()` (fetched once for
 * the email + display name). Server-side only.
 */
export async function getSession(): Promise<Session | null> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  const meta = sessionClaims?.metadata ?? {};
  const user = await currentUser();
  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const fullName =
    meta.fullName ??
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ??
    email;

  return {
    user: {
      id: userId,
      email,
      fullName,
      imageUrl: user.imageUrl ?? null,
      role: meta.role ?? "beauty_advisor",
      storeId: meta.storeId ?? null,
      zoneId: meta.zoneId ?? null,
      brandId: meta.brandId ?? null,
      divisionId: meta.divisionId ?? null,
      specialty: meta.specialty ?? null,
      active: meta.active ?? true,
    },
  };
}
