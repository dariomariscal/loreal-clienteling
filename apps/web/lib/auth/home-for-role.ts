import type { UserRole } from "@loreal/contracts";

export const ADVISOR_HOME = "/advisor/today";
export const DASHBOARD_HOME = "/";

export function homeForRole(role: UserRole | string | null | undefined): string {
  if (role === "beauty_advisor" || role === "counter_manager") {
    return ADVISOR_HOME;
  }
  return DASHBOARD_HOME;
}
