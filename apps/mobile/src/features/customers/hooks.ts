import type {
  CreateCustomer,
  RegisterCustomer,
  UpdateCustomer,
} from "@loreal/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  customersApi,
  type CustomerActivityCursor,
  type CustomerListFilters,
} from "./api";

export const customerKeys = {
  all: ["customers"] as const,
  list: (filters: CustomerListFilters) =>
    [...customerKeys.all, "list", filters] as const,
  detail: (id: string) => [...customerKeys.all, "detail", id] as const,
  metrics: (id: string) => [...customerKeys.all, "metrics", id] as const,
  activity: (id: string, cursor: CustomerActivityCursor) =>
    [...customerKeys.all, "activity", id, cursor] as const,
  search: (query: string, type: string) =>
    [...customerKeys.all, "search", type, query] as const,
};

export function useCustomers(filters: CustomerListFilters = {}) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: () => customersApi.list(filters),
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: customerKeys.detail(id ?? ""),
    queryFn: () => customersApi.get(id as string),
    enabled: !!id,
  });
}

export function useCustomerMetrics(id: string | undefined) {
  return useQuery({
    queryKey: customerKeys.metrics(id ?? ""),
    queryFn: () => customersApi.getMetrics(id as string),
    enabled: !!id,
  });
}

export function useCustomerActivity(
  id: string | undefined,
  cursor: CustomerActivityCursor = {},
) {
  return useQuery({
    queryKey: customerKeys.activity(id ?? "", cursor),
    queryFn: () => customersApi.getActivity(id as string, cursor),
    enabled: !!id,
  });
}

export function useCustomerSearch(
  query: string,
  type: "exact" | "name" | "semantic" = "name",
) {
  return useQuery({
    queryKey: customerKeys.search(query, type),
    queryFn: () => customersApi.search(query, type),
    enabled: query.trim().length > 0,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCustomer) => customersApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: customerKeys.all }),
  });
}

export function useRegisterCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterCustomer) => customersApi.register(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: customerKeys.all }),
  });
}

export function useUpdateCustomer(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCustomer) => customersApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.detail(id) });
      qc.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}
