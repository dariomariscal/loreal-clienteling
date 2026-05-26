import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CreateCustomer, UpdateCustomer } from "@loreal/contracts";

// ── Types ──────────────────────────────────────────────────────────

/**
 * Full customer row as returned by `GET /customers/:id`. Mirrors the `customers`
 * table in `@loreal/database` — Drizzle returns numeric columns as strings to
 * preserve precision.
 */
export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  gender: string | null;
  birthday: string | null;
  preferredLanguage: string;
  preferredChannel: string | null;
  acceptsMarketingEmail: boolean;
  acceptsMarketingSms: boolean;
  acceptsMarketingWhatsapp: boolean;
  taxId: string | null;
  signupStoreId: string;
  createdByUserId: string;
  assignedToUserId: string | null;
  enrolledAt: string;
  lastInteractionAt: string | null;
  lastOrderAt: string | null;
  totalSpent: string;
  ordersCount: number;
  averageOrderValue: string;
  loyaltyTier: string | null;
  loyaltyPoints: number;
  lifecycleStage: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Narrow projection used by `GET /customers` (list) and `/customers/search`.
 * The list endpoint adds `assignedToName`, `ltv` and `orderCount` from joined
 * subqueries; it does not include `isActive`, `createdByUserId`, timestamps,
 * or the lifetime/loyalty denormalizations.
 */
export interface CustomerListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  birthday: string | null;
  lifecycleStage: string;
  enrolledAt: string;
  lastInteractionAt: string | null;
  lastOrderAt: string | null;
  signupStoreId: string;
  assignedToUserId: string | null;
  assignedToName: string | null;
  ltv: string | null;
  orderCount: number | null;
}

// ── Query keys ─────────────────────────────────────────────────────

const customerKeys = {
  all: (params?: Record<string, string>) => ["customers", params ?? {}] as const,
  search: (query: string, type: string) => ["customers", "search", query, type] as const,
  detail: (id: string) => ["customers", id] as const,
};

// ── Queries ────────────────────────────────────────────────────────

interface PaginatedCustomers {
  data: CustomerListItem[];
  total: number;
  page: number;
  limit: number;
}

export function useCustomers(params?: {
  page?: string;
  limit?: string;
  stage?: string;
  storeId?: string;
  assignedToUserId?: string;
  birthdayWithinDays?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  const queryParams: Record<string, string> = {};
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v) queryParams[k] = v;
    });
  }

  return useQuery({
    queryKey: customerKeys.all(queryParams),
    queryFn: () => api.get<PaginatedCustomers>("/customers", Object.keys(queryParams).length ? queryParams : undefined),
  });
}

export function useCustomerSearch(query: string, type: string = "name") {
  return useQuery({
    queryKey: customerKeys.search(query, type),
    queryFn: () =>
      api.get<CustomerListItem[]>("/customers/search", { query, type }),
    enabled: query.length >= 2,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => api.get<Customer>(`/customers/${id}`),
    enabled: !!id,
  });
}

// ── Mutations ──────────────────────────────────────────────────────

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCustomer) =>
      api.post<Customer>("/customers", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateCustomer) =>
      api.patch<Customer>(`/customers/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) });
    },
  });
}

export function useDeleteCustomerArco() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, requestFolio }: { id: string; requestFolio: string }) =>
      api.delete<{ success: boolean; requestFolio: string }>(`/customers/${id}/arco`, { requestFolio }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
}

/**
 * Reassign a customer to another BA. Used by the Counter Manager from the
 * consolidated NBA queue (drag a card onto another BA).
 */
export interface ReassignCustomerInput {
  id: string;
  newAssignedToUserId: string;
  reason?: string;
}

export function useReassignCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: ReassignCustomerInput) =>
      api.post<Customer>(`/customers/${id}/reassign`, body),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) });
      // Consolidated NBA queue depends on the assignment.
      queryClient.invalidateQueries({
        queryKey: ["ai", "suggested-actions"],
      });
    },
  });
}
