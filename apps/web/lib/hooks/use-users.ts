import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

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

interface InvitePayload {
  email: string;
  fullName: string;
  role: string;
  storeId?: string;
  zoneId?: string;
  brandId?: string;
}

interface InviteResult {
  invitationId: string;
  email: string;
  status: "pending";
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InvitePayload) =>
      api.post<InviteResult>("/users/invite", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export interface CreateDirectUserResult {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  password: string;
}

export function useCreateUserDirect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InvitePayload) =>
      api.post<CreateDirectUserResult>("/users", data),
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

export interface ResetPasswordResult {
  userId: string;
  email: string;
  fullName: string;
  password: string;
}

export function useResetUserPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<ResetPasswordResult>(`/users/${id}/reset-password`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      api.delete<{ invitationId: string; status: "revoked" }>(
        `/users/invitations/${invitationId}`,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

// Activate / deactivate now go through the normal update endpoint, which
// mirrors `active` onto Clerk publicMetadata so the JWT stays in sync.
export function useSetUserActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch<User>(`/users/${id}`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useSetUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch<User>(`/users/${id}`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}
