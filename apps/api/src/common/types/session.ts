import type { UserRole } from "@loreal/contracts";

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  storeId: string | null;
  brandId: string | null;
  zoneId: string | null;
  /**
   * L'Oréal division (luxe, consumer, active, professional). Required for
   * area_manager and national_retail_manager scope resolution.
   */
  divisionId: string | null;
  /** BA specialty (generalist, makeup_artist, …). Null for non-BA roles. */
  specialty: string | null;
  active: boolean;
  fullName: string;
}

export interface UserSession {
  user: SessionUser;
  session: {
    id: string;
    token: string;
    expiresAt: Date;
    userId: string;
  };
}
