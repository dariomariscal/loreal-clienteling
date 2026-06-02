import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { products } from "./products";
import { users } from "./auth";
import { stores } from "./stores";
import { customerVisits } from "./customer-visits";

/**
 * Product recommendation made by an advisor (or surfaced by AI and surfaced
 * via the advisor). Conversion tracking closes the loop with orders.
 */
export const recommendations = pgTable(
  "recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    recommendedByUserId: text("recommended_by_user_id")
      .notNull()
      .references(() => users.id),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),

    recommendedAt: timestamp("recommended_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    source: varchar("source", { length: 30 }).notNull(),
    // manual | ai_suggested | replenishment_alert | next_best_action
    aiReasoning: text("ai_reasoning"),
    notes: text("notes"),

    visitPurpose: varchar("visit_purpose", { length: 30 }),
    // new_purchase | rebuy | gift | concern | promotion | browsing

    /** Optional origin links for traceability. */
    visitId: uuid("visit_id").references(() => customerVisits.id, {
      onDelete: "set null",
    }),
    appointmentId: uuid("appointment_id"),
    messageId: uuid("message_id"),
    wishlistId: uuid("wishlist_id"),

    isConverted: boolean("is_converted").notNull().default(false),
    convertedOrderId: uuid("converted_order_id"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("recommendations_customer_idx").on(table.customerId),
    index("recommendations_store_idx").on(table.storeId),
    index("recommendations_recommended_by_idx").on(table.recommendedByUserId),
    index("recommendations_visit_idx").on(table.visitId),
  ],
);
