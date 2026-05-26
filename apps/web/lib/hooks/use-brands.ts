import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { api } from "@/lib/api-client";
import type {
  createBrandSchema,
  updateBrandSchema,
  upsertBrandConfigSchema,
} from "@/lib/schemas/brands";

// ── Types (inferred from API responses) ────────────────────────────

export interface Brand {
  id: string;
  code: string;
  displayName: string;
  tier: string;
  /**
   * L'Oréal division (luxe, consumer, active, professional). Drives scope
   * for Area Managers and National Retail Managers. Optional in the payload
   * because legacy seed rows may predate the divisions table.
   */
  divisionId?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
}

export interface BrandConfig {
  id: string;
  brandId: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  logoUrl: string | null;
  fontFamily: string | null;
  replenishmentRules: unknown;
  isVirtualTryonEnabled: boolean;
  vipThresholdAmount: string | null;
  vipThresholdPeriodMonths: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrandWithConfig extends Brand {
  config: BrandConfig | null;
}

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
export type UpsertBrandConfigInput = z.infer<typeof upsertBrandConfigSchema>;

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
    // A 404 here means the brand id is stale (deleted brand, dev fixture, etc.)
    // Retrying just floods the console with the same error.
    retry: false,
  });
}

// ── Mutations ──────────────────────────────────────────────────────

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBrandInput) => api.post<Brand>("/brands", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandKeys.all }),
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateBrandInput) =>
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
    mutationFn: ({ brandId, ...data }: { brandId: string } & UpsertBrandConfigInput) =>
      api.put<BrandConfig>(`/brands/${brandId}/config`, data),
    onSuccess: (_, { brandId }) => {
      queryClient.invalidateQueries({ queryKey: brandKeys.all });
      queryClient.invalidateQueries({ queryKey: brandKeys.detail(brandId) });
    },
  });
}
