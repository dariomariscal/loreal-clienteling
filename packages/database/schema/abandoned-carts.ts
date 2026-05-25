import {
  pgTable,
  uuid,
  numeric,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";

/**
 * Online carts a customer left without completing. Standard ecommerce
 * pattern (Shopify "abandoned checkouts", Klaviyo "Started Checkout").
 * Drives `suggested_actions.triggerType = "abandoned_cart"` for the
 * advisor's next-best-action queue.
 */
export const abandonedCarts = pgTable(
  "abandoned_carts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    /** Snapshot of items in the cart at abandonment time. */
    items: jsonb("items").$type<
      Array<{
        productId: string;
        variantId?: string;
        quantity: number;
        price: string;
      }>
    >().notNull(),
    totalValue: numeric("total_value", { precision: 12, scale: 2 }).notNull(),
    abandonedAt: timestamp("abandoned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    recoveredOrderId: uuid("recovered_order_id"),
    recoveredAt: timestamp("recovered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("abandoned_carts_customer_idx").on(table.customerId)],
);
