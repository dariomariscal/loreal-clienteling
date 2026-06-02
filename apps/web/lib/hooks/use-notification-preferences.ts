import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  NotificationPreferenceResolved,
  UpsertNotificationPreference,
  NotificationPreference,
} from "@loreal/contracts";

/**
 * BA preferences: which notification kinds get delivered, over which channels.
 * The list endpoint returns a resolved view — one entry per kind with the
 * BA's overrides merged on top of system defaults — so the UI never has to
 * know what the default was.
 */

export const notificationPreferenceKeys = {
  all: ["notifications", "preferences"] as const,
};

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationPreferenceKeys.all,
    queryFn: () =>
      api.get<NotificationPreferenceResolved[]>(
        "/notifications/preferences",
      ),
  });
}

export function useUpsertNotificationPreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertNotificationPreference) =>
      api.patch<NotificationPreference>(
        "/notifications/preferences",
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationPreferenceKeys.all });
    },
  });
}
