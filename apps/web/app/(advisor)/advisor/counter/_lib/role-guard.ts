import type { UserRole } from "@loreal/contracts";

/**
 * Roles allowed to operate the counter ("Mostrador") section.
 * Mirrors COUNTER_ROLES in advisor-nav.tsx — keep in sync.
 */
const ALLOWED: ReadonlyArray<UserRole> = [
  "counter_manager",
  "area_manager",
  "national_retail_manager",
  "admin",
];

export function isCounterRole(role: UserRole): boolean {
  return ALLOWED.includes(role);
}
