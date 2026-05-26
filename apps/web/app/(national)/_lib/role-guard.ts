import type { UserRole } from "@loreal/contracts";

/**
 * Roles allowed inside the (national) section. NRM is the primary audience;
 * admin gets in as a superset so they can QA the screens.
 */
const ALLOWED: ReadonlyArray<UserRole> = ["national_retail_manager", "admin"];

export function isNationalRole(role: UserRole): boolean {
  return ALLOWED.includes(role);
}
