import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { z } from "zod";
import type {
  createSalesTargetSchema,
  updateSalesTargetSchema,
  salesTargetFiltersSchema,
} from "@/lib/schemas/sales-targets";

// ── Types ──────────────────────────────────────────────────────────

export type TargetOwnerType = "counter" | "user" | "store" | "area";
export type TargetMetricKind =
  | "sales_amount"
  | "sales_units"
  | "appointments_booked"
  | "appointments_completed"
  | "follow_ups_completed"
  | "new_customers"
  | "samples_given"
  | "visits";
export type TargetPeriodKind = "daily" | "weekly" | "monthly" | "quarterly";

export interface SalesTarget {
  id: string;
  ownerType: TargetOwnerType;
  storeId: string | null;
  brandId: string | null;
  ownerUserId: string | null;
  metricKind: TargetMetricKind;
  periodKind: TargetPeriodKind;
  periodStart: string;
  periodEnd: string;
  targetValue: string;
  currency: string | null;
  parentTargetId: string | null;
  notes: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

/** Hero card payload: today's target + actual sales. */
export interface CounterTargetProgress {
  date: string;
  storeId: string;
  brandId: string;
  targetValue: number | null;
  actualAmount: number;
  attainmentPct: number | null;
  currency: string;
}

export type CreateSalesTargetInput = z.infer<typeof createSalesTargetSchema>;
export type UpdateSalesTargetInput = z.infer<typeof updateSalesTargetSchema>;
export type SalesTargetFilters = z.infer<typeof salesTargetFiltersSchema>;

// ── Query keys ─────────────────────────────────────────────────────

const salesTargetKeys = {
  all: ["sales-targets"] as const,
  list: (filters: SalesTargetFilters) =>
    ["sales-targets", "list", filters] as const,
  today: (params: { storeId?: string; brandId?: string; date?: string }) =>
    ["sales-targets", "today", params] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useSalesTargets(filters: SalesTargetFilters = {}) {
  const params: Record<string, string> = {};
  if (filters.ownerType) params.ownerType = filters.ownerType;
  if (filters.storeId) params.storeId = filters.storeId;
  if (filters.brandId) params.brandId = filters.brandId;
  if (filters.ownerUserId) params.ownerUserId = filters.ownerUserId;
  if (filters.metricKind) params.metricKind = filters.metricKind;
  if (filters.periodKind) params.periodKind = filters.periodKind;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;

  return useQuery({
    queryKey: salesTargetKeys.list(filters),
    queryFn: () => api.get<SalesTarget[]>("/sales-targets", params),
  });
}

export function useSalesTargetToday(
  params: { storeId?: string; brandId?: string; date?: string } = {},
) {
  const query: Record<string, string> = {};
  if (params.storeId) query.storeId = params.storeId;
  if (params.brandId) query.brandId = params.brandId;
  if (params.date) query.date = params.date;

  return useQuery({
    queryKey: salesTargetKeys.today(params),
    queryFn: () =>
      api.get<CounterTargetProgress>("/sales-targets/today", query),
  });
}

// ── Mutations ──────────────────────────────────────────────────────

export function useCreateSalesTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSalesTargetInput) =>
      api.post<SalesTarget>("/sales-targets", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: salesTargetKeys.all }),
  });
}

export function useUpdateSalesTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateSalesTargetInput) =>
      api.patch<SalesTarget>(`/sales-targets/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: salesTargetKeys.all }),
  });
}

export function useDeleteSalesTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ success: true }>(`/sales-targets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: salesTargetKeys.all }),
  });
}
