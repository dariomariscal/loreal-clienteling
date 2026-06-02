/**
 * Browser-side helpers for Web Push registration. Kept as pure functions
 * (no React, no hooks) so the orchestration hook (`useEnablePush`) can
 * compose them without prop-drilling.
 *
 * The Service Worker file lives at `/sw.js` (served from `apps/web/public/sw.js`).
 * Scope is `/` so it can receive push events anywhere in the app.
 */

export interface PushSupport {
  notifications: boolean;
  pushManager: boolean;
  serviceWorker: boolean;
}

/**
 * Feature-detect Web Push capabilities. SSR-safe: returns all false when
 * `window` is undefined.
 */
export function detectPushSupport(): PushSupport {
  if (typeof window === "undefined") {
    return { notifications: false, pushManager: false, serviceWorker: false };
  }
  return {
    notifications: "Notification" in window,
    pushManager: "PushManager" in window,
    serviceWorker: "serviceWorker" in navigator,
  };
}

/**
 * Register (or reuse) the service worker. Idempotent — calling it twice
 * returns the same registration. Resolves once the SW is active and ready
 * to receive push events.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    throw new Error("Service Workers no soportados en este navegador.");
  }
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) {
    await navigator.serviceWorker.ready;
    return existing;
  }
  const reg = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    // updateViaCache "none" forces the browser to revalidate sw.js on each
    // navigation — important so a deploy with a fixed SW reaches BAs quickly.
    updateViaCache: "none",
  });
  await navigator.serviceWorker.ready;
  return reg;
}

/**
 * Subscribe the current device to push notifications using the server's
 * VAPID public key. Reuses an existing subscription if one is already
 * present, otherwise creates a new one. Returns the W3C-shaped record
 * the API expects.
 */
export async function subscribeToPush(
  vapidPublicKey: string,
): Promise<{
  endpoint: string;
  keys: { p256dh: string; auth: string };
}> {
  const reg = await registerServiceWorker();

  const existing = await reg.pushManager.getSubscription();
  // Cast through BufferSource: TypeScript 5's stricter
  // `Uint8Array<ArrayBufferLike>` generic doesn't satisfy the PushManager DOM
  // signature even though every runtime accepts a plain Uint8Array. Safe.
  const applicationServerKey = urlBase64ToUint8Array(
    vapidPublicKey,
  ) as unknown as BufferSource;
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    }));

  return serializeSubscription(sub);
}

/** Look up the current push subscription, if any. */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  const reg = await navigator.serviceWorker.getRegistration("/");
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

/**
 * Cancel the browser-side push subscription. Does NOT touch the server —
 * the caller (UI) is responsible for the DELETE API call when it knows the
 * subscription id.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  const sub = await getCurrentSubscription();
  if (!sub) return false;
  return sub.unsubscribe();
}

// ── Internals ────────────────────────────────────────────────────────

/**
 * Extract `{ endpoint, keys: { p256dh, auth } }` from a browser
 * `PushSubscription`. The browser returns keys as ArrayBuffers; we encode
 * them as URL-safe base64 so they survive JSON transport.
 */
function serializeSubscription(sub: PushSubscription) {
  const p256dh = sub.getKey("p256dh");
  const auth = sub.getKey("auth");
  if (!p256dh || !auth) {
    throw new Error("La suscripción push devuelta no incluye llaves.");
  }
  return {
    endpoint: sub.endpoint,
    keys: {
      p256dh: arrayBufferToBase64Url(p256dh),
      auth: arrayBufferToBase64Url(auth),
    },
  };
}

/**
 * Convert the standard base64-encoded VAPID public key the server sends
 * into the Uint8Array the PushManager.subscribe API requires.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function arrayBufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
