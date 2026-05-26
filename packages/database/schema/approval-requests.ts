import {
  pgTable,
  uuid,
  text,
  varchar,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { stores } from "./stores";
import { brands } from "./brands";
import { customers } from "./customers";

/**
 * Generic approval inbox. A Beauty Advisor raises a request; the Counter
 * Manager of the same counter approves or rejects it.
 *
 * `type` discriminates the payload:
 *   reservation_long      → { productReservationId, quantity, holdUntil, reason }
 *   discount_special      → { orderDraftId?, customerId, discountPct, reason }
 *   return                → { orderId, items: [{ lineItemId, quantity }], reason }
 *   vip_profile_change    → { customerId, changes: { field: { from, to } } }
 *
 * Kept generic on purpose: every approval type lives behind one inbox endpoint,
 * one audit shape, one notification path.
 */
export const approvalRequests = pgTable(
  "approval_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    type: varchar("type", { length: 40 }).notNull(),
    // reservation_long | discount_special | return | vip_profile_change

    status: varchar("status", { length: 20 }).notNull().default("pending"),
    // pending | approved | rejected | cancelled

    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    brandId: uuid("brand_id").references(() => brands.id),

    customerId: uuid("customer_id").references(() => customers.id),

    requestedByUserId: text("requested_by_user_id")
      .notNull()
      .references(() => users.id),
    decidedByUserId: text("decided_by_user_id").references(() => users.id),

    reason: text("reason"),
    decisionNotes: text("decision_notes"),

    payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),

    decidedAt: timestamp("decided_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("approval_requests_store_status_idx").on(table.storeId, table.status),
    index("approval_requests_requested_by_idx").on(table.requestedByUserId),
    index("approval_requests_customer_idx").on(table.customerId),
  ],
);
