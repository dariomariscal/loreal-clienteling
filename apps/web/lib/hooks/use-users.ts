import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";

// ── Types ──────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  storeId: string | null;
  storeName: string | null;
  zoneId: string | null;
  zoneName: string | null;
  brandId: string | null;
  brandName: string | null;
  active: boolean;
  invitationStatus: string | null;
  invitedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

interface UserFilters {
  role?: string;
  storeId?: string;
  zoneId?: string;
  brandId?: string;
  active?: string;
  invitationStatus?: string;
  search?: string;
  page?: string;
  limit?: string;
}

interface PaginatedUsers {
  data: User[];
  total: number;
  page: number;
  limit: number;
}

// ── Query keys ─────────────────────────────────────────────────────

const userKeys = {
  all: (filters?: UserFilters) => ["users", filters] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useUsers(filters?: UserFilters) {
  const params: Record<string, string> = {};
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params[k] = v;
    });
  }

  return useQuery({
    queryKey: userKeys.all(filters),
    queryFn: () =>
      api.get<PaginatedUsers>(
        "/users",
        Object.keys(params).length > 0 ? params : undefined,
      ),
  });
}

// ── Mutations ──────────────────────────────────────────────────────

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      email: string;
      fullName: string;
      role: string;
      storeId?: string;
      zoneId?: string;
      brandId?: string;
    }) => api.post<User>("/users/invite", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      role?: string;
      storeId?: string | null;
      zoneId?: string | null;
      brandId?: string | null;
      active?: boolean;
      fullName?: string;
    }) => api.patch<User>(`/users/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      email: string;
      fullName: string;
      role: string;
      storeId?: string;
      zoneId?: string;
      brandId?: string;
    }) => api.post<User>("/users", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUserPassword(userId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["users", userId, "password"],
    queryFn: () => api.get<{ password: string }>(`/users/${userId}/password`),
    enabled: enabled && !!userId,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useSetUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await authClient.admin.setRole({ userId, role: role as "admin" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useBanUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await authClient.admin.banUser({ userId });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUnbanUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await authClient.admin.unbanUser({ userId });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}
