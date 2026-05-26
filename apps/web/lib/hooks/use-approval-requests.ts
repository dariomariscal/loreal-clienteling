import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { z } from "zod";
import type {
  createApprovalRequestSchema,
  decideApprovalRequestSchema,
  approvalRequestFiltersSchema,
} from "@/lib/schemas/approval-requests";

// ── Types ──────────────────────────────────────────────────────────

export type ApprovalType =
  | "reservation_long"
  | "discount_special"
  | "return"
  | "vip_profile_change";

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  status: ApprovalStatus;
  storeId: string;
  brandId: string | null;
  customerId: string | null;
  requestedByUserId: string;
  decidedByUserId: string | null;
  reason: string | null;
  decisionNotes: string | null;
  payload: Record<string, unknown>;
  decidedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** List endpoint joins requester name for the inbox UI. */
export interface ApprovalRequestRow extends ApprovalRequest {
  requestedByName: string | null;
}

export type CreateApprovalRequestInput = z.infer<
  typeof createApprovalRequestSchema
>;
export type DecideApprovalRequestInput = z.infer<
  typeof decideApprovalRequestSchema
>;
export type ApprovalRequestFilters = z.infer<
  typeof approvalRequestFiltersSchema
>;

// ── Query keys ─────────────────────────────────────────────────────

const approvalKeys = {
  all: ["approvals"] as const,
  list: (filters: ApprovalRequestFilters) =>
    ["approvals", "list", filters] as const,
  detail: (id: string) => ["approvals", id] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useApprovalRequests(filters: ApprovalRequestFilters = {}) {
  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.type) params.type = filters.type;
  if (filters.requestedByUserId)
    params.requestedByUserId = filters.requestedByUserId;
  if (filters.customerId) params.customerId = filters.customerId;

  return useQuery({
    queryKey: approvalKeys.list(filters),
    queryFn: () => api.get<ApprovalRequestRow[]>("/approvals", params),
  });
}

export function useApprovalRequest(id: string) {
  return useQuery({
    queryKey: approvalKeys.detail(id),
    queryFn: () => api.get<ApprovalRequest>(`/approvals/${id}`),
    enabled: !!id,
  });
}

// ── Mutations ──────────────────────────────────────────────────────

export function useCreateApprovalRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateApprovalRequestInput) =>
      api.post<ApprovalRequest>("/approvals", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: approvalKeys.all }),
  });
}

export function useDecideApprovalRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & DecideApprovalRequestInput) =>
      api.post<ApprovalRequest>(`/approvals/${id}/decision`, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: approvalKeys.detail(updated.id) });
      qc.invalidateQueries({ queryKey: ["approvals", "list"] });
      // The counter dashboard surfaces the pending count, refresh it too.
      qc.invalidateQueries({ queryKey: ["dashboards", "counter"] });
    },
  });
}

export function useCancelApprovalRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<ApprovalRequest>(`/approvals/${id}/cancel`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: approvalKeys.all });
      qc.invalidateQueries({ queryKey: ["dashboards", "counter"] });
    },
  });
}
