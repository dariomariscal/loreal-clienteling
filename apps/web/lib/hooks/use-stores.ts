import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CreateStore, StoreHours } from "@loreal/contracts";

export type { StoreHours };

// ── Types ──────────────────────────────────────────────────────────

export interface Store {
  id: string;
  code: string;
  displayName: string;
  banner: string;
  /** Derived server-side from address. Null until a zone covers the store's municipality. */
  zoneId: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  /** Alcaldía label from Mapbox (e.g. "Miguel Hidalgo"). */
  district: string | null;
  /** INEGI 5-digit code, derived by trigger from lat/lng. */
  municipalityId: string | null;
  postcode: string | null;
  /** Numeric columns arrive as strings from Drizzle to preserve precision. */
  lat: string | null;
  lng: string | null;
  phone: string | null;
  hours: StoreHours | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreWithBrands extends Store {
  brandIds: string[];
}

// ── Query keys ─────────────────────────────────────────────────────

const storeKeys = {
  all: ["stores"] as const,
  detail: (id: string) => ["stores", id] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useStores() {
  return useQuery({
    queryKey: storeKeys.all,
    queryFn: () => api.get<Store[]>("/stores"),
  });
}

export function useStore(id: string) {
  return useQuery({
    queryKey: storeKeys.detail(id),
    queryFn: () => api.get<StoreWithBrands>(`/stores/${id}`),
    enabled: !!id,
  });
}

// ── Mutations ──────────────────────────────────────────────────────

export function useCreateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStore) => api.post<Store>("/stores", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: storeKeys.all }),
  });
}

export function useUpdateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<CreateStore>) =>
      api.patch<Store>(`/stores/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: storeKeys.all });
      queryClient.invalidateQueries({ queryKey: storeKeys.detail(id) });
    },
  });
}
