import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { z } from "zod";
import type {
  createBaRatingSchema,
  baNpsFiltersSchema,
} from "@/lib/schemas/ba-ratings";

// ── Types ──────────────────────────────────────────────────────────

export type BaRatingSource =
  | "post_visit_survey"
  | "whatsapp_survey"
  | "manager_attested"
  | "counter_kiosk";

export interface BaRating {
  id: string;
  reviewedUserId: string;
  customerId: string;
  storeId: string;
  appointmentId: string | null;
  score: number;
  comment: string | null;
  source: BaRatingSource;
  submittedByUserId: string | null;
  createdAt: string;
}

/** Aggregated NPS per BA — used by the team ranking on the counter dashboard. */
export interface BaNps {
  userId: string;
  fullName: string | null;
  responseCount: number;
  promoters: number;
  passives: number;
  detractors: number;
  averageScore: number;
  nps: number;
}

export type CreateBaRatingInput = z.infer<typeof createBaRatingSchema>;
export type BaNpsFilters = z.infer<typeof baNpsFiltersSchema>;

// ── Query keys ─────────────────────────────────────────────────────

const baRatingKeys = {
  all: ["ba-ratings"] as const,
  nps: (filters: BaNpsFilters) => ["ba-ratings", "nps", filters] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useBaNps(filters: BaNpsFilters = {}) {
  const params: Record<string, string> = {};
  if (filters.storeId) params.storeId = filters.storeId;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;

  return useQuery({
    queryKey: baRatingKeys.nps(filters),
    queryFn: () => api.get<BaNps[]>("/ba-ratings/nps", params),
  });
}

// ── Mutations ──────────────────────────────────────────────────────

export function useCreateBaRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBaRatingInput) =>
      api.post<BaRating>("/ba-ratings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: baRatingKeys.all });
      // NPS surfaces in the counter dashboard team ranking.
      qc.invalidateQueries({ queryKey: ["dashboards", "counter"] });
    },
  });
}
