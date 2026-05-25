import type { UserRole } from "@loreal/contracts";

export const ADVISOR_HOME = "/advisor/today";
export const DASHBOARD_HOME = "/";

export function homeForRole(role: UserRole | string | null | undefined): string {
  return role === "ba" ? ADVISOR_HOME : DASHBOARD_HOME;
}
