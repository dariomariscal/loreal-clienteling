import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { customers } from "./customers";
import { products } from "./products";
import { appointments } from "./appointments";
import { orders } from "./orders";
import { suggestedActions } from "./suggested-actions";
import { approvalRequests } from "./approval-requests";
import { baRatings } from "./ba-ratings";
import { customerVisits } from "./customer-visits";

/**
 * In-app + push notification queue for Beauty Advisors. Distinct from
 * `suggestedActions` (pre-computed nightly NBA list) and from `messages`
 * (customer-facing communications). Notifications are interruption-style
 * alerts the BA receives in real time or near real time.
 *
 * Designed following the Salesforce / Tulip / NewStore clienteling pattern:
 * one row per delivered alert, with `kind` discriminating what triggered it
 * and optional foreign keys pinning the notification to the originating
 * entity so the click-through deep-link works without recomputation.
 *
 * `groupKey` enables idempotent dedup (e.g. don't deliver the same
 * wishlist_back_in_stock alert twice for the same customer+product). Unique
 * per (recipient + groupKey) when groupKey is non-null.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientUserId: text("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /**
     * Discriminator for the trigger. Mirrors the 17 BA-relevant alerts
     * documented in the clienteling research:
     *
     *   Urgent (push by default):
     *     customer_reply | appointment_imminent | customer_arrived
     *     | approval_decided
     *
     *   Important (in-app, push optional):
     *     daily_actions_ready | followup_overdue | wishlist_back_in_stock
     *     | wishlist_price_drop | reservation_expiring | message_read
     *
     *   Useful (in-app only):
     *     birthday_today | sample_followup_due | dormant_customer
     *     | abandoned_cart | replenishment_due | ba_rating_received
     *     | new_customer_assigned
     */
    kind: varchar("kind", { length: 40 }).notNull(),

    /** low | normal | high | urgent — drives sound, banner style, push policy. */
    priority: varchar("priority", { length: 10 }).notNull().default("normal"),

    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    /** Deep link target inside the BA app (e.g. /customers/:id, /messages/:id). */
    actionUrl: varchar("action_url", { length: 500 }),

    // Optional pivots — set whichever apply so the UI can show context badges
    // and so click-through can navigate without an extra lookup.
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "cascade",
    }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    suggestedActionId: uuid("suggested_action_id").references(
      () => suggestedActions.id,
      { onDelete: "set null" },
    ),
    approvalRequestId: uuid("approval_request_id").references(
      () => approvalRequests.id,
      { onDelete: "set null" },
    ),
    baRatingId: uuid("ba_rating_id").references(() => baRatings.id, {
      onDelete: "set null",
    }),
    visitId: uuid("visit_id").references(() => customerVisits.id, {
      onDelete: "set null",
    }),

    /**
     * Dedup key. Convention: `<kind>:<entity>:<bucket>`. Bucket may be a date
     * or a window, so the same alert kind isn't re-delivered within the same
     * meaningful period (e.g. `birthday_today:cust_abc:2026-05-25`).
     */
    groupKey: varchar("group_key", { length: 200 }),

    /** Delivery channels actually attempted, comma-separated: in_app,push. */
    deliveredChannels: varchar("delivered_channels", { length: 50 }),
    /** Number of push subscriptions the service tried to write to. */
    pushAttempts: integer("push_attempts").notNull().default(0),

    readAt: timestamp("read_at", { withTimezone: true }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
    /** Auto-hide after this timestamp; UI stops surfacing stale alerts. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // The dominant query: "give me my unread notifications, newest first".
    index("notifications_recipient_created_idx").on(
      table.recipientUserId,
      table.createdAt,
    ),
    index("notifications_recipient_unread_idx").on(
      table.recipientUserId,
      table.readAt,
    ),
    index("notifications_group_key_idx").on(
      table.recipientUserId,
      table.groupKey,
    ),
    index("notifications_customer_idx").on(table.customerId),
  ],
);
