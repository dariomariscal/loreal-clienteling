import type { UserRole } from "@loreal/contracts";

export const ADVISOR_HOME = "/advisor/today";
export const AREA_MANAGER_HOME = "/area-manager/today";
export const NATIONAL_HOME = "/national/today";
export const DASHBOARD_HOME = "/";

export function homeForRole(role: UserRole | string | null | undefined): string {
  if (role === "beauty_advisor" || role === "counter_manager") {
    return ADVISOR_HOME;
  }
  if (role === "area_manager") {
    return AREA_MANAGER_HOME;
  }
  if (role === "national_retail_manager") {
    return NATIONAL_HOME;
  }
  return DASHBOARD_HOME;
}
