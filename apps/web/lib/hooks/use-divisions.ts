import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Division } from "@loreal/contracts";

// ── Query keys ─────────────────────────────────────────────────────

const divisionKeys = {
  all: ["divisions"] as const,
  detail: (id: string) => ["divisions", id] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useDivisions() {
  return useQuery({
    queryKey: divisionKeys.all,
    queryFn: () => api.get<Division[]>("/divisions"),
  });
}

export function useDivision(id: string) {
  return useQuery({
    queryKey: divisionKeys.detail(id),
    queryFn: () => api.get<Division>(`/divisions/${id}`),
    enabled: !!id,
    // A 404 means the id is stale (deleted division). Retrying just floods
    // the console with the same error.
    retry: false,
  });
}

// ── Mutations ──────────────────────────────────────────────────────

export function useCreateDivision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      code: string;
      displayName: string;
      isActive?: boolean;
    }) => api.post<Division>("/divisions", data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: divisionKeys.all }),
  });
}

export function useUpdateDivision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Partial<{
      code: string;
      displayName: string;
      isActive: boolean;
    }>) => api.patch<Division>(`/divisions/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: divisionKeys.all });
      queryClient.invalidateQueries({ queryKey: divisionKeys.detail(id) });
    },
  });
}

export function useDeleteDivision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ success: true }>(`/divisions/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: divisionKeys.all }),
  });
}

export type { Division };
