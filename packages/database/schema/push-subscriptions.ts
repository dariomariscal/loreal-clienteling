import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

/**
 * Browser-issued Web Push subscriptions per user. A user may have multiple
 * (iPad at counter + personal laptop + phone PWA). The `endpoint` URL is
 * the unique identifier issued by the browser's push service (FCM / Apple
 * Push / Mozilla autopush) — we send notifications to it via the W3C Web
 * Push protocol using the `web-push` library and our VAPID keys.
 *
 * No native APNs / FCM device tokens — the Next.js BA app is a PWA and
 * uses the standard Web Push API exclusively.
 */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /** PushSubscription.endpoint — opaque URL from the browser. Unique per device. */
    endpoint: text("endpoint").notNull(),
    /** PushSubscription.keys.p256dh — client public key for payload encryption. */
    p256dh: text("p256dh").notNull(),
    /** PushSubscription.keys.auth — shared auth secret for HMAC. */
    auth: text("auth").notNull(),

    /** Browser user-agent at subscribe time; helps debug stale endpoints. */
    userAgent: text("user_agent"),
    /** Free-form device label the BA can set in settings ("iPad mostrador 1"). */
    deviceLabel: varchar("device_label", { length: 100 }),

    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    /** Set when the push service returns 404/410 — sub is dead, stop trying. */
    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("push_subscriptions_endpoint_idx").on(table.endpoint),
    index("push_subscriptions_user_idx").on(table.userId),
  ],
);
