import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AppointmentOverview } from "@loreal/contracts";

// Re-export so consumers import a single name from one place.
export type { AppointmentOverview };

interface UseAppointmentOverviewParams {
  from?: string;
  to?: string;
}

const overviewKeys = {
  overview: (from?: string, to?: string) =>
    ["analytics", "appointments", "overview", from, to] as const,
};

/**
 * One-shot fetch for the appointment metrics page. The shape is role-aware
 * server-side — BAs get `teamRanking = null`, managers get a populated array.
 */
export function useAppointmentOverview(
  params: UseAppointmentOverviewParams = {},
) {
  const query: Record<string, string> = {};
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;

  return useQuery({
    queryKey: overviewKeys.overview(params.from, params.to),
    queryFn: () =>
      api.get<AppointmentOverview>(
        "/analytics/appointments/overview",
        query,
      ),
  });
}
