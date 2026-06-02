/* eslint-disable no-restricted-globals */
// L'Oréal Clienteling — Service Worker for Web Push.
//
// Two responsibilities only:
//   1. Show an OS-level notification when the API pushes one (push event).
//   2. Focus / open the right deep-link when the user taps it (notificationclick).
//
// Deliberately tiny: no caching, no offline strategies, no Workbox. Add those
// later if PWA scope expands. Pure vanilla so it works in every browser that
// supports Web Push (Chrome, Edge, Firefox, Safari 16.4+ when installed as a PWA).

self.addEventListener("install", (event) => {
  // Activate immediately so a freshly-deployed SW starts handling pushes
  // without waiting for every tab to close.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  // Take control of pages opened before the SW was registered.
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  // Payload shape matches the JSON the API's PushService sends:
  //   { id, kind, priority, title, body, url }
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // Fall back to raw text if the payload isn't JSON (some browsers / test
    // tools send plain strings).
    payload = { title: "Nueva notificación", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Nueva notificación";
  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-badge.png",
    data: {
      url: payload.url || "/",
      id: payload.id,
      kind: payload.kind,
    },
    // urgent → vibrate + don't auto-dismiss; everything else stays silent
    requireInteraction: payload.priority === "urgent",
    vibrate: payload.priority === "urgent" ? [200, 100, 200] : undefined,
    // Tag per kind+entity so a re-fired notification replaces instead of stacking.
    tag: payload.id ? String(payload.id) : payload.kind || "default",
    renotify: payload.priority === "urgent",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // If a tab is already open on the same origin, focus it and tell it
      // to navigate. Avoids spawning a new window for every notification.
      for (const client of allClients) {
        if ("focus" in client) {
          try {
            await client.focus();
            if ("navigate" in client) {
              await client.navigate(target);
            } else {
              client.postMessage({ type: "navigate", url: target });
            }
            return;
          } catch {
            // Fall through and open a new window.
          }
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(target);
      }
    })(),
  );
});

// Optional but useful: the browser fires this when the subscription is
// invalidated (key rotation, expiration). We log so it shows in DevTools;
// re-subscribing requires the main thread and the VAPID key, so the BA will
// need to re-enable from the UI on next visit.
self.addEventListener("pushsubscriptionchange", (event) => {
  console.warn("Push subscription changed — user must re-subscribe.", event);
});
