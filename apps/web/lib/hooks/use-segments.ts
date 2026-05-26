import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { z } from "zod";
import type {
  segmentFilterSchema,
  createSegmentSchema,
  updateSegmentSchema,
} from "@/lib/schemas/segments";

// ── Types ──────────────────────────────────────────────────────────

export type SegmentFilter = z.infer<typeof segmentFilterSchema>;
export type CreateSegmentInput = z.infer<typeof createSegmentSchema>;
export type UpdateSegmentInput = z.infer<typeof updateSegmentSchema>;

export interface CustomerSegment {
  id: string;
  ownerUserId: string | null;
  brandId: string | null;
  /** Division-level segments (NRM-shared). Null for personal/brand/global. */
  divisionId: string | null;
  name: string;
  description: string | null;
  filter: SegmentFilter;
  isDynamic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  loyaltyTier: string | null;
  lifecycleStage: string;
  totalSpent: string;
  ordersCount: number;
  lastOrderAt: string | null;
  birthday: string | null;
}

// ── Query keys ─────────────────────────────────────────────────────

const segmentKeys = {
  all: ["segments"] as const,
  detail: (id: string) => ["segments", id] as const,
  customers: (id: string) => ["segments", id, "customers"] as const,
  count: (id: string) => ["segments", id, "count"] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useSegments() {
  return useQuery({
    queryKey: segmentKeys.all,
    queryFn: () => api.get<CustomerSegment[]>("/segments"),
  });
}

export function useSegment(id: string) {
  return useQuery({
    queryKey: segmentKeys.detail(id),
    queryFn: () => api.get<CustomerSegment>(`/segments/${id}`),
    enabled: !!id,
  });
}

export function useSegmentCustomers(id: string, limit?: number) {
  const params: Record<string, string> = {};
  if (limit !== undefined) params.limit = String(limit);

  return useQuery({
    queryKey: [...segmentKeys.customers(id), limit] as const,
    queryFn: () => api.get<SegmentCustomer[]>(`/segments/${id}/customers`, params),
    enabled: !!id,
  });
}

export function useSegmentCount(id: string) {
  return useQuery({
    queryKey: segmentKeys.count(id),
    queryFn: () => api.get<{ count: number }>(`/segments/${id}/count`),
    enabled: !!id,
  });
}

// ── Mutations ──────────────────────────────────────────────────────

export function useCreateSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSegmentInput) =>
      api.post<CustomerSegment>("/segments", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: segmentKeys.all }),
  });
}

export function useUpdateSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateSegmentInput) =>
      api.patch<CustomerSegment>(`/segments/${id}`, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: segmentKeys.detail(updated.id) });
      qc.invalidateQueries({ queryKey: segmentKeys.all });
    },
  });
}

export function useDeleteSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ id: string; deleted: true }>(`/segments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: segmentKeys.all }),
  });
}

/**
 * Run a filter without persisting it — useful for "preview customers" UI before
 * saving a segment.
 */
export function usePreviewSegment() {
  return useMutation({
    mutationFn: (filter: SegmentFilter) =>
      api.post<SegmentCustomer[]>("/segments/preview", { filter }),
  });
}
