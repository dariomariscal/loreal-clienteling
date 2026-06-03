import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

// ── Types ──────────────────────────────────────────────────────────

export type RetailGroupKind = "retailer" | "banner" | "region";

export interface RetailGroup {
  id: string;
  code: string;
  name: string;
  kind: RetailGroupKind;
  parentId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RetailGroupStore {
  id: string;
  code: string;
  displayName: string;
  banner: string;
  isActive: boolean;
}

// ── Query keys ─────────────────────────────────────────────────────

const retailGroupKeys = {
  all: ["retail-groups"] as const,
  banners: ["retail-groups", "banners"] as const,
  retailers: ["retail-groups", "retailers"] as const,
  detail: (id: string) => ["retail-groups", id] as const,
  stores: (id: string) => ["retail-groups", id, "stores"] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useRetailGroups() {
  return useQuery({
    queryKey: retailGroupKeys.all,
    queryFn: () => api.get<RetailGroup[]>("/retail-groups"),
  });
}

export function useBanners() {
  return useQuery({
    queryKey: retailGroupKeys.banners,
    queryFn: () => api.get<RetailGroup[]>("/retail-groups/banners"),
  });
}

export function useRetailers() {
  return useQuery({
    queryKey: retailGroupKeys.retailers,
    queryFn: () => api.get<RetailGroup[]>("/retail-groups/retailers"),
  });
}

export function useRetailGroup(id: string) {
  return useQuery({
    queryKey: retailGroupKeys.detail(id),
    queryFn: () => api.get<RetailGroup>(`/retail-groups/${id}`),
    enabled: Boolean(id),
  });
}

export function useStoresInRetailGroup(id: string) {
  return useQuery({
    queryKey: retailGroupKeys.stores(id),
    queryFn: () => api.get<RetailGroupStore[]>(`/retail-groups/${id}/stores`),
    enabled: Boolean(id),
  });
}
