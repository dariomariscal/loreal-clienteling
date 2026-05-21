// Augments Clerk's session token shape so `auth().sessionClaims` is typed.
// Source of truth lives in Clerk publicMetadata, surfaced into the JWT via
// the default session token (no JWT template needed for these claims).

export {};

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: "ba" | "manager" | "supervisor" | "admin";
      fullName?: string;
      storeId?: string | null;
      zoneId?: string | null;
      brandId?: string | null;
      active?: boolean;
      mustChangePassword?: boolean;
    };
  }

  interface UserPublicMetadata {
    role?: "ba" | "manager" | "supervisor" | "admin";
    fullName?: string;
    storeId?: string | null;
    zoneId?: string | null;
    brandId?: string | null;
    active?: boolean;
    invitationStatus?: "pending" | "accepted" | "revoked";
    invitedByUserId?: string;
    mustChangePassword?: boolean;
  }
}
