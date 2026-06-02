/**
 * Server view of a browser PushSubscription. Mirrors the W3C shape so the
 * frontend can stringify a `PushSubscription` directly and POST it.
 *
 * The `web-push` library on the API side reads exactly these three fields
 * (endpoint + keys.p256dh + keys.auth) to encrypt and dispatch payloads.
 */
export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  deviceLabel: string | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

/**
 * Payload accepted by POST /notifications/push-subscriptions. The two key
 * names match what `navigator.serviceWorker.subscribe()` returns on the
 * client; we destructure into the DB columns server-side.
 */
export interface CreatePushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  deviceLabel?: string;
}

/**
 * VAPID public key returned to the client so the browser can call
 * `subscribe({ applicationServerKey })`. Private key NEVER leaves the API.
 */
export interface PushVapidPublicKey {
  publicKey: string;
}
