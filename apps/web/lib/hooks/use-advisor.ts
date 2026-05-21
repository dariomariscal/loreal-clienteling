import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AdvisorToday } from "@loreal/contracts";

const advisorKeys = {
  today: ["advisor", "today"] as const,
};

/**
 * The Beauty Advisor's "Today" feed — one fetch for the home screen so the
 * BA sees citas, cumpleaños, en riesgo, nuevos y follow-ups in a single
 * paint. Refreshes when the tab regains focus so a new appointment booked
 * in another window shows up immediately.
 */
export function useAdvisorToday() {
  return useQuery({
    queryKey: advisorKeys.today,
    queryFn: () => api.get<AdvisorToday>("/advisor/today"),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
