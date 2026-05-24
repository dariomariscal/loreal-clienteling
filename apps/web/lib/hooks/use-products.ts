import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  BulkCreateProducts,
  BulkImportResult,
  ProductSemanticSearchResult,
} from "@loreal/contracts";

export type { ProductSemanticSearchResult };

// ── Types ──────────────────────────────────────────────────────────

export interface Product {
  id: string;
  sku: string;
  brandId: string;
  name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  price: string;
  images: string[] | null;
  ingredients: string[] | null;
  shadeOptions: Record<string, unknown> | null;
  estimatedDurationDays: number | null;
  technicalSheetUrl: string | null;
  tutorialUrl: string | null;
  salesArgument: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  brand?: { id: string; displayName: string; code: string };
}

export interface ProductAvailability {
  id: string;
  productId: string;
  storeId: string;
  stockStatus: string;
  lastSyncedAt: string | null;
}

// ── Query keys ─────────────────────────────────────────────────────

const productKeys = {
  all: (params?: Record<string, string>) => ["products", params ?? {}] as const,
  detail: (id: string) => ["products", id] as const,
  availability: (id: string) => ["products", id, "availability"] as const,
  semantic: (q: string, limit: number) =>
    ["products", "semantic", q, limit] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useProducts(
  params?: { page?: string; limit?: string; category?: string; search?: string },
  options?: { enabled?: boolean },
) {
  const queryParams: Record<string, string> = {};
  if (params?.page) queryParams.page = params.page;
  if (params?.limit) queryParams.limit = params.limit;
  if (params?.category) queryParams.category = params.category;
  if (params?.search) queryParams.search = params.search;

  return useQuery({
    queryKey: productKeys.all(queryParams),
    queryFn: () => api.get<Product[]>("/products", queryParams),
    enabled: options?.enabled ?? true,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => api.get<Product>(`/products/${id}`),
    enabled: !!id,
  });
}

/**
 * Semantic + lexical product search. Gate behind `enabled` (e.g. only fire
 * for phrase-like queries) so the customer-list search doesn't burn OpenAI
 * tokens on every keystroke.
 */
export function useProductSemanticSearch(
  query: string,
  limit = 10,
  options?: { enabled?: boolean },
) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: productKeys.semantic(trimmed, limit),
    queryFn: () =>
      api.get<ProductSemanticSearchResult[]>("/products/semantic-search", {
        q: trimmed,
        limit: String(limit),
      }),
    enabled: (options?.enabled ?? true) && trimmed.length >= 2,
  });
}

export function useProductAvailability(id: string) {
  return useQuery({
    queryKey: productKeys.availability(id),
    queryFn: () => api.get<ProductAvailability[]>(`/products/${id}/availability`),
    enabled: !!id,
  });
}

// ── Mutations ──────────────────────────────────────────────────────

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<Product>("/products", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useBulkCreateProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkCreateProducts) =>
      api.post<BulkImportResult>("/products/bulk", data),
    onSuccess: (result) => {
      if (result.inserted > 0) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
      }
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      api.patch<Product>(`/products/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
    },
  });
}

export function useUpdateProductAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, storeId, stockStatus }: { productId: string; storeId: string; stockStatus: string }) =>
      api.patch<ProductAvailability>(`/products/${productId}/availability/${storeId}`, { stockStatus }),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.availability(productId) });
    },
  });
}

