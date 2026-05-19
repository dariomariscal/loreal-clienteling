import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CreateZone, UpdateZone } from "@loreal/contracts";

// ── Types ──────────────────────────────────────────────────────────

export interface Zone {
  id: string;
  code: string;
  displayName: string;
  color: string;
  icon: string;
  /** Legacy text field — kept nullable for backwards compatibility. */
  region: string | null;
  municipalityIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ── Query keys ─────────────────────────────────────────────────────

const zoneKeys = {
  all: ["zones"] as const,
  detail: (id: string) => ["zones", id] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useZones() {
  return useQuery({
    queryKey: zoneKeys.all,
    queryFn: () => api.get<Zone[]>("/zones"),
  });
}

export function useZone(id: string) {
  return useQuery({
    queryKey: zoneKeys.detail(id),
    queryFn: () => api.get<Zone>(`/zones/${id}`),
    enabled: !!id,
  });
}

// ── Mutations ──────────────────────────────────────────────────────

export function useCreateZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateZone) => api.post<Zone>("/zones", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: zoneKeys.all }),
  });
}

export function useUpdateZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateZone) =>
      api.patch<Zone>(`/zones/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: zoneKeys.all });
      queryClient.invalidateQueries({ queryKey: zoneKeys.detail(id) });
    },
  });
}
