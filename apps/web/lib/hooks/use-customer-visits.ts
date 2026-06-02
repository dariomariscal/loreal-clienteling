import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { VisitStatus } from "@loreal/contracts";
import type {
  CustomerVisit,
  StartVisitPayload,
  UpdateVisitPayload,
  CloseVisitPayload,
  VisitListFilters,
} from "@loreal/contracts";

// ── Types ──────────────────────────────────────────────────────────

/** List/timeline row — embeds the relations the API joins in by default. */
export interface CustomerVisitListItem extends CustomerVisit {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    lifecycleStage: string | null;
  } | null;
  attendedBy: {
    id: string;
    fullName: string;
  } | null;
  store: {
    id: string;
    displayName: string;
  } | null;
}

export interface AbandonVisitPayload {
  notes?: string;
}

// ── Query keys ─────────────────────────────────────────────────────

const visitKeys = {
  all: ["customer-visits"] as const,
  list: (filters?: VisitListFilters) =>
    ["customer-visits", "list", filters ?? {}] as const,
  byCustomer: (customerId: string) =>
    ["customer-visits", "by-customer", customerId] as const,
  detail: (id: string) => ["customer-visits", id] as const,
};

function filtersToParams(
  filters?: VisitListFilters,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (!filters) return params;
  if (filters.customerId) params.customerId = filters.customerId;
  if (filters.storeId) params.storeId = filters.storeId;
  if (filters.attendedByUserId) params.attendedByUserId = filters.attendedByUserId;
  if (filters.status) params.status = filters.status;
  if (filters.visitReason) params.visitReason = filters.visitReason;
  if (filters.from) params.from = filters.from.toISOString();
  if (filters.to) params.to = filters.to.toISOString();
  return params;
}

// ── Queries ────────────────────────────────────────────────────────

export function useCustomerVisits(filters?: VisitListFilters) {
  return useQuery({
    queryKey: visitKeys.list(filters),
    queryFn: () =>
      api.get<CustomerVisitListItem[]>(
        "/customer-visits",
        filtersToParams(filters),
      ),
  });
}

/** Per-customer timeline — every visit, newest first. */
export function useCustomerVisitsByCustomer(customerId: string) {
  return useQuery({
    queryKey: visitKeys.byCustomer(customerId),
    queryFn: () =>
      api.get<CustomerVisit[]>(`/customers/${customerId}/visits`),
    enabled: !!customerId,
  });
}

export function useCustomerVisit(id: string) {
  return useQuery({
    queryKey: visitKeys.detail(id),
    queryFn: () => api.get<CustomerVisitListItem>(`/customer-visits/${id}`),
    enabled: !!id,
  });
}

// ── Mutations ──────────────────────────────────────────────────────

/** Start a visit (walk-in or arrival from a booked appointment). */
export function useStartCustomerVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: StartVisitPayload) =>
      api.post<CustomerVisit>("/customer-visits", data),
    onSuccess: (visit) => {
      qc.invalidateQueries({ queryKey: visitKeys.all });
      qc.invalidateQueries({ queryKey: visitKeys.byCustomer(visit.customerId) });
    },
  });
}

export function useUpdateCustomerVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateVisitPayload) =>
      api.patch<CustomerVisit>(`/customer-visits/${id}`, data),
    onSuccess: (visit) => {
      qc.invalidateQueries({ queryKey: visitKeys.all });
      qc.invalidateQueries({ queryKey: visitKeys.detail(visit.id) });
      qc.invalidateQueries({ queryKey: visitKeys.byCustomer(visit.customerId) });
    },
  });
}

/** Close-out: BA captures visitReason + outcome at the end of the visit. */
export function useCloseCustomerVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & CloseVisitPayload) =>
      api.post<CustomerVisit>(`/customer-visits/${id}/close`, data),
    onSuccess: (visit) => {
      qc.invalidateQueries({ queryKey: visitKeys.all });
      qc.invalidateQueries({ queryKey: visitKeys.detail(visit.id) });
      qc.invalidateQueries({ queryKey: visitKeys.byCustomer(visit.customerId) });
    },
  });
}

/**
 * The current BA's open visit (status=in_progress). Returns the most recent
 * in-progress visit attended by `attendedByUserId`. Used by:
 *   - ActiveVisitPill (the persistent floating chip)
 *   - ActiveContextSection (surfaces "Visita en curso" at the top)
 *   - CustomerQuickActions (hides "Iniciar visita" when one is already open)
 *
 * Refetches every 30s so the pill's "X min" stays roughly current without a
 * client-side ticker, and re-runs whenever the user pulls the window into
 * focus (returning from POS / camera).
 */
export function useActiveVisit(attendedByUserId: string | undefined) {
  return useQuery({
    queryKey: ["customer-visits", "active", attendedByUserId ?? ""],
    queryFn: async () => {
      const visits = await api.get<CustomerVisitListItem[]>(
        "/customer-visits",
        {
          attendedByUserId: attendedByUserId!,
          status: VisitStatus.IN_PROGRESS,
        },
      );
      return visits[0] ?? null;
    },
    enabled: !!attendedByUserId,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

/** Customer left mid-consultation — record it without a reason/outcome. */
export function useAbandonCustomerVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & AbandonVisitPayload) =>
      api.post<CustomerVisit>(`/customer-visits/${id}/abandon`, data),
    onSuccess: (visit) => {
      qc.invalidateQueries({ queryKey: visitKeys.all });
      qc.invalidateQueries({ queryKey: visitKeys.detail(visit.id) });
      qc.invalidateQueries({ queryKey: visitKeys.byCustomer(visit.customerId) });
    },
  });
}
