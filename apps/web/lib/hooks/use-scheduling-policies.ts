import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  CreateSchedulingPolicyInput,
  UpdateSchedulingPolicyInput,
} from "@/lib/schemas/scheduling-policies";

// ── Types ──────────────────────────────────────────────────────────

export interface ActiveDays {
  mon?: boolean;
  tue?: boolean;
  wed?: boolean;
  thu?: boolean;
  fri?: boolean;
  sat?: boolean;
  sun?: boolean;
}

export interface BlackoutRange {
  from: string;
  to: string;
  reason?: string;
}

export interface SchedulingPolicy {
  id: string;
  storeId: string | null;
  serviceTypeId: string | null;
  slotGranularityMinutes: number;
  minLeadTimeMinutes: number | null;
  maxAdvanceDays: number | null;
  activeDays: ActiveDays | null;
  workWindowStart: string | null;
  workWindowEnd: string | null;
  blackoutDates: BlackoutRange[] | null;
  priority: number;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EffectiveSchedulingPolicy {
  slotGranularityMinutes: number;
  minLeadTimeMinutes: number;
  maxAdvanceDays: number;
  activeDays: ActiveDays;
  workWindowStart: string;
  workWindowEnd: string;
  blackoutDates: BlackoutRange[];
  sourcePolicyId: string | null;
}

// ── Keys ───────────────────────────────────────────────────────────

const keys = {
  all: ["scheduling-policies"] as const,
  detail: (id: string) => ["scheduling-policies", id] as const,
  effective: (storeId: string | null, serviceTypeId: string | null) =>
    ["scheduling-policies", "effective", storeId, serviceTypeId] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useSchedulingPolicies() {
  return useQuery({
    queryKey: keys.all,
    queryFn: () => api.get<SchedulingPolicy[]>("/scheduling-policies"),
  });
}

export function useSchedulingPolicy(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => api.get<SchedulingPolicy>(`/scheduling-policies/${id}`),
    enabled: !!id,
  });
}

/**
 * Resolve the policy that would apply to a (store, service) pair. Mirror of
 * what the booking engine does server-side — useful for the booking form to
 * preview "slot every 30 min, weekdays only" before any slot is requested.
 */
export function useEffectiveSchedulingPolicy(params: {
  storeId?: string | null;
  serviceTypeId?: string | null;
  enabled?: boolean;
}) {
  const query: Record<string, string> = {};
  if (params.storeId) query.storeId = params.storeId;
  if (params.serviceTypeId) query.serviceTypeId = params.serviceTypeId;

  return useQuery({
    queryKey: keys.effective(
      params.storeId ?? null,
      params.serviceTypeId ?? null,
    ),
    queryFn: () =>
      api.get<EffectiveSchedulingPolicy>(
        "/scheduling-policies/effective",
        query,
      ),
    enabled: params.enabled ?? true,
  });
}

// ── Mutations ──────────────────────────────────────────────────────

export function useCreateSchedulingPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSchedulingPolicyInput) =>
      api.post<SchedulingPolicy>("/scheduling-policies", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateSchedulingPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & UpdateSchedulingPolicyInput) =>
      api.patch<SchedulingPolicy>(`/scheduling-policies/${id}`, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: keys.detail(updated.id) });
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({
        queryKey: ["scheduling-policies", "effective"],
      });
    },
  });
}

export function useDeleteSchedulingPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.delete<{ id: string }>(`/scheduling-policies/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}
