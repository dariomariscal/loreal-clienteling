import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  CreatePushSubscription,
  PushSubscriptionRecord,
  PushVapidPublicKey,
} from "@loreal/contracts";
import {
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
  type PushSupport,
  detectPushSupport,
} from "@/lib/push/register";

export const pushKeys = {
  vapidPublicKey: ["notifications", "push", "vapid"] as const,
};

/**
 * Fetches the server's VAPID public key. Used by `useEnablePush()` to feed
 * `pushManager.subscribe({ applicationServerKey })`. Cached forever — the
 * key only changes if VAPID is regenerated server-side.
 */
export function useVapidPublicKey(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: pushKeys.vapidPublicKey,
    queryFn: () =>
      api.get<PushVapidPublicKey>("/notifications/push/vapid-public-key"),
    staleTime: Infinity,
    enabled: opts?.enabled ?? true,
  });
}

export function useSubscribePush() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePushSubscription) =>
      api.post<PushSubscriptionRecord>(
        "/notifications/push/subscriptions",
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", "push"] });
    },
  });
}

export function useUnsubscribePush() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subscriptionId: string) =>
      api.delete<PushSubscriptionRecord>(
        `/notifications/push/subscriptions/${subscriptionId}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", "push"] });
    },
  });
}

// ── High-level orchestration ─────────────────────────────────────────

export interface PushState {
  /** What the browser can do (notifications API, push API, SW). */
  support: PushSupport;
  /** Current Notification.permission value, or "unknown" before mount. */
  permission: NotificationPermission | "unknown";
  /** True when this browser is already subscribed (to *any* server). */
  isSubscribed: boolean;
  /** True while permission prompt + subscribe round-trip is in flight. */
  isEnabling: boolean;
  /** Last error from enable/disable, if any. */
  error: Error | null;
}

/**
 * One-stop hook for the bell-icon "Enable push" button:
 *
 *   const { state, enable, disable } = useEnablePush();
 *
 * `enable()` is the full flow: register SW → request permission → fetch
 * VAPID key → subscribe browser → POST to API. `disable()` reverses it.
 *
 * Designed so a single UI button can drive the whole thing.
 */
export function useEnablePush() {
  const [permission, setPermission] = useState<
    NotificationPermission | "unknown"
  >("unknown");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Detect support once, on the client. SSR-safe (returns "none").
  const [support, setSupport] = useState<PushSupport>(() => ({
    notifications: false,
    pushManager: false,
    serviceWorker: false,
  }));

  // Probe support + read current permission/subscription state once mounted.
  useEffect(() => {
    const s = detectPushSupport();
    setSupport(s);
    if (s.notifications) setPermission(Notification.permission);
    if (s.serviceWorker && s.pushManager) {
      getCurrentSubscription()
        .then((sub) => setIsSubscribed(sub != null))
        .catch(() => setIsSubscribed(false));
    }
  }, []);

  const subscribeMut = useSubscribePush();
  const unsubscribeMut = useUnsubscribePush();
  // Lazy-fetch VAPID — we only need it the moment the BA hits "enable",
  // so disable the query until then to avoid an extra request on every
  // page load.
  const vapidQuery = useVapidPublicKey({ enabled: false });

  const enable = useCallback(async () => {
    setError(null);
    if (
      !support.notifications ||
      !support.pushManager ||
      !support.serviceWorker
    ) {
      const err = new Error(
        "Tu navegador no soporta notificaciones push. En iPad/iPhone debes instalar la app desde Safari → Compartir → Agregar a pantalla de inicio.",
      );
      setError(err);
      throw err;
    }

    setIsEnabling(true);
    try {
      await registerServiceWorker();

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        throw new Error(
          "El usuario rechazó el permiso de notificaciones.",
        );
      }

      const vapidResult = await vapidQuery.refetch();
      const publicKey = vapidResult.data?.publicKey;
      if (!publicKey) {
        throw new Error(
          "El servidor no tiene VAPID configurado. Contacta al admin.",
        );
      }

      const sub = await subscribeToPush(publicKey);
      await subscribeMut.mutateAsync({
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        },
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      });
      setIsSubscribed(true);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setIsEnabling(false);
    }
  }, [support, subscribeMut, vapidQuery]);

  /**
   * Tears down: unsubscribe in the browser, then revoke in the API.
   * Caller passes the server-side `subscriptionId` if known — used to delete
   * the row. If unknown, the browser unsubscribe still runs and the server
   * row is left for the next 410-on-send to clean up.
   */
  const disable = useCallback(
    async (subscriptionId?: string) => {
      setError(null);
      try {
        await unsubscribeFromPush();
        if (subscriptionId) {
          await unsubscribeMut.mutateAsync(subscriptionId);
        }
        setIsSubscribed(false);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      }
    },
    [unsubscribeMut],
  );

  const state: PushState = {
    support,
    permission,
    isSubscribed,
    isEnabling,
    error,
  };

  return { state, enable, disable };
}
