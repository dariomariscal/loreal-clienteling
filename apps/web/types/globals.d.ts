// Augments Clerk's session token shape so `auth().sessionClaims` is typed.
// Source of truth lives in Clerk publicMetadata, surfaced into the JWT via
// the default session token (no JWT template needed for these claims).

export {};

type RoleLiteral =
  | "beauty_advisor"
  | "counter_manager"
  | "area_manager"
  | "national_retail_manager"
  | "admin";

type SpecialtyLiteral =
  | "generalist"
  | "makeup_artist"
  | "skincare_expert"
  | "fragrance_specialist";

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: RoleLiteral;
      fullName?: string;
      storeId?: string | null;
      zoneId?: string | null;
      brandId?: string | null;
      divisionId?: string | null;
      specialty?: SpecialtyLiteral | null;
      active?: boolean;
    };
  }

  interface UserPublicMetadata {
    role?: RoleLiteral;
    fullName?: string;
    storeId?: string | null;
    zoneId?: string | null;
    brandId?: string | null;
    divisionId?: string | null;
    specialty?: SpecialtyLiteral | null;
    active?: boolean;
    invitationStatus?: "pending" | "accepted" | "revoked";
    invitedByUserId?: string;
  }

  /**
   * Self-editable preferences. `unsafeMetadata` is writable by the user
   * themselves via the Clerk client SDK, no admin endpoint needed.
   */
  interface UserUnsafeMetadata {
    preferences?: {
      defaultMessageChannel?: "whatsapp" | "sms" | "email";
      language?: "es" | "en";
      notifyOnBirthday?: boolean;
      notifyOnUpcomingAppointment?: boolean;
      notifyOnIncomingMessage?: boolean;
    };
  }
}
