import { auth, currentUser } from "@clerk/nextjs/server";
import type { UserRole } from "@loreal/contracts";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  storeId: string | null;
  zoneId: string | null;
  brandId: string | null;
  active: boolean;
  mustChangePassword: boolean;
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
      role: meta.role ?? "ba",
      storeId: meta.storeId ?? null,
      zoneId: meta.zoneId ?? null,
      brandId: meta.brandId ?? null,
      active: meta.active ?? true,
      mustChangePassword: meta.mustChangePassword ?? false,
    },
  };
}
