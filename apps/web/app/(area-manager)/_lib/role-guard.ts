import type { UserRole } from "@loreal/contracts";

/**
 * Roles allowed inside the (area-manager) section. Area managers are the
 * primary audience; admin gets in as a superset so they can QA the screens.
 */
const ALLOWED: ReadonlyArray<UserRole> = ["area_manager", "admin"];

export function isAreaManagerRole(role: UserRole): boolean {
  return ALLOWED.includes(role);
}
