import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { z } from "zod";
import type {
  createShiftSchema,
  updateShiftSchema,
  shiftFiltersSchema,
} from "@/lib/schemas/shifts";

// ── Types ──────────────────────────────────────────────────────────

export type ShiftStatus =
  | "scheduled"
  | "active"
  | "completed"
  | "off"
  | "vacation"
  | "sick";

export interface Shift {
  id: string;
  userId: string;
  userFullName: string | null;
  userSpecialty: string | null;
  storeId: string;
  shiftDate: string;
  startTime: string | null;
  endTime: string | null;
  status: ShiftStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Roster row enriched with `isOnShiftNow` computed server-side. */
export interface ShiftRosterEntry {
  shiftId: string;
  userId: string;
  fullName: string | null;
  specialty: string | null;
  startTime: string | null;
  endTime: string | null;
  status: ShiftStatus;
  isOnShiftNow: boolean;
}

export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
export type ShiftFilters = z.infer<typeof shiftFiltersSchema>;

// ── Query keys ─────────────────────────────────────────────────────

const shiftKeys = {
  all: ["shifts"] as const,
  list: (filters: ShiftFilters) => ["shifts", "list", filters] as const,
  today: (storeId?: string) => ["shifts", "today", storeId ?? null] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useShifts(filters: ShiftFilters = {}) {
  const params: Record<string, string> = {};
  if (filters.storeId) params.storeId = filters.storeId;
  if (filters.userId) params.userId = filters.userId;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.status) params.status = filters.status;

  return useQuery({
    queryKey: shiftKeys.list(filters),
    queryFn: () => api.get<Shift[]>("/shifts", params),
  });
}

export function useTodayRoster(storeId?: string) {
  const params: Record<string, string> = {};
  if (storeId) params.storeId = storeId;

  return useQuery({
    queryKey: shiftKeys.today(storeId),
    queryFn: () => api.get<ShiftRosterEntry[]>("/shifts/today", params),
  });
}

// ── Mutations ──────────────────────────────────────────────────────

export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateShiftInput) => api.post<Shift>("/shifts", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: shiftKeys.all }),
  });
}

export function useUpdateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateShiftInput) =>
      api.patch<Shift>(`/shifts/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: shiftKeys.all }),
  });
}

export function useDeleteShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ success: true }>(`/shifts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: shiftKeys.all }),
  });
}
