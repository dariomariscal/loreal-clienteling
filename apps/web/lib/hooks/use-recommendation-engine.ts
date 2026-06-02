import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { EngineRecommendation } from "@loreal/contracts";

/**
 * Hook layer for the recommendation engine.
 *
 *  - `useEngineRecommendations(customerId)` reads the current cache of
 *    engine-produced recommendations for a customer; it does NOT trigger
 *    the engine. The first time the BA opens a profile, the cache is
 *    empty and the section shows a CTA to generate.
 *
 *  - `useGenerateRecommendations()` calls `POST /recommendations/generate`,
 *    which runs the pipeline, persists the rows and returns the ranked
 *    output. We invalidate the read query on success so the section
 *    refreshes automatically.
 */
interface EngineCacheParams {
  customerId: string;
}

const keys = {
  engine: (customerId: string) =>
    ["recommendations", "engine", customerId] as const,
};

/**
 * Local-only cache of the last generated batch. The list endpoint
 * (`GET /customers/:id/recommendations`) returns ALL recommendations
 * including manual ones; here we only want what the engine produced this
 * session so the hero/strip UI doesn't mix manual rows in.
 */
export function useEngineRecommendationsCache({ customerId }: EngineCacheParams) {
  return useQuery({
    queryKey: keys.engine(customerId),
    queryFn: () => Promise.resolve<EngineRecommendation[]>([]),
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: false,
  });
}

interface CustomerAiConversion {
  rate: number;
  total: number;
  converted: number;
  deltaPct: number | null;
  trend: number[];
}

/**
 * Per-customer AI conversion KPI. Reads from
 * `GET /analytics/customers/:id/ai-conversion` which aggregates the engine's
 * persisted rows (ai_suggested + next_best_action + replenishment_alert)
 * over the last 90 days plus a 6-month sparkline.
 */
export function useCustomerAiConversion(customerId: string) {
  return useQuery({
    queryKey: ["analytics", "customer-ai-conversion", customerId] as const,
    queryFn: () =>
      api.get<CustomerAiConversion>(
        `/analytics/customers/${customerId}/ai-conversion`,
      ),
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000,
  });
}

interface GenerateInput {
  customerId: string;
  limit?: number;
  withRationale?: boolean;
  persist?: boolean;
}

export function useGenerateRecommendations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateInput) =>
      api.post<EngineRecommendation[]>("/recommendations/generate", input),
    onSuccess: (data, vars) => {
      qc.setQueryData(keys.engine(vars.customerId), data);
      // The persisted list endpoint is the source of truth for tabs like
      // "Historia". Invalidate so it refetches with the new rows.
      qc.invalidateQueries({
        queryKey: ["customers", vars.customerId, "recommendations"],
      });
    },
  });
}
