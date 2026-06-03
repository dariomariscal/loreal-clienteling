import type { UserRole } from "@loreal/contracts";

export function isAdminRole(role: UserRole | string | null | undefined): boolean {
  return role === "admin";
}
