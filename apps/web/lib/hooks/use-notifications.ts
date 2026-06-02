import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  NotificationWithCustomer,
  NotificationUnreadCount,
  NotificationKind,
} from "@loreal/contracts";

/**
 * Hooks for the BA notification inbox + unread badge.
 *
 * The unread-count query polls every 30s so the bell icon stays fresh
 * without WebSockets. Heavier than push but adequate for v1 — and survives
 * a closed Service Worker tab.
 */

// ── Query keys ─────────────────────────────────────────────────────

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (status: string, kind?: string) =>
    ["notifications", "list", status, kind ?? "any"] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export type NotificationListStatus = "unread" | "read" | "dismissed" | "all";

export function useNotifications(opts?: {
  status?: NotificationListStatus;
  kind?: NotificationKind;
  limit?: number;
  enabled?: boolean;
}) {
  const status = opts?.status ?? "unread";
  const kind = opts?.kind;
  const params: Record<string, string> = { status };
  if (kind) params.kind = kind;
  if (opts?.limit) params.limit = String(opts.limit);

  return useQuery({
    queryKey: notificationKeys.list(status, kind),
    queryFn: () =>
      api.get<NotificationWithCustomer[]>("/notifications", params),
    enabled: opts?.enabled ?? true,
  });
}

/**
 * Used by the bell-icon badge. Polls every 30 seconds — short enough that
 * the BA sees a new alert within half a minute, long enough that we don't
 * burn server resources or battery.
 */
export function useUnreadCount(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: () =>
      api.get<NotificationUnreadCount>("/notifications/unread-count"),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    enabled: opts?.enabled ?? true,
  });
}

// ── Mutations ──────────────────────────────────────────────────────

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<NotificationWithCustomer>(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDismissNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<NotificationWithCustomer>(`/notifications/${id}/dismiss`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<{ markedRead: number }>("/notifications/mark-all-read", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
