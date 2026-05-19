import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

// ── Types (inferred from API responses) ────────────────────────────

export interface Brand {
  id: string;
  code: string;
  displayName: string;
  tier: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BrandConfig {
  id: string;
  brandId: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  logoUrl: string | null;
  fontFamily: string | null;
  messageTemplates: unknown;
  replenishmentRules: unknown;
  virtualTryonEnabled: boolean;
}

export interface BrandWithConfig extends Brand {
  config: BrandConfig | null;
}

// ── Query keys ─────────────────────────────────────────────────────

const brandKeys = {
  all: ["brands"] as const,
  detail: (id: string) => ["brands", id] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useBrands() {
  return useQuery({
    queryKey: brandKeys.all,
    queryFn: () => api.get<Brand[]>("/brands"),
  });
}

export function useBrand(id: string) {
  return useQuery({
    queryKey: brandKeys.detail(id),
    queryFn: () => api.get<BrandWithConfig>(`/brands/${id}`),
    enabled: !!id,
  });
}

// ── Mutations ──────────────────────────────────────────────────────

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { code: string; displayName: string; tier: string; logoUrl?: string }) =>
      api.post<Brand>("/brands", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandKeys.all }),
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<{ code: string; displayName: string; tier: string; logoUrl: string; active: boolean }>) =>
      api.patch<Brand>(`/brands/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: brandKeys.all });
      queryClient.invalidateQueries({ queryKey: brandKeys.detail(id) });
    },
  });
}

export function useUpdateBrandConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ brandId, ...data }: { brandId: string } & Record<string, unknown>) =>
      api.put<BrandConfig>(`/brands/${brandId}/config`, data),
    onSuccess: (_, { brandId }) => {
      queryClient.invalidateQueries({ queryKey: brandKeys.detail(brandId) });
    },
  });
}
