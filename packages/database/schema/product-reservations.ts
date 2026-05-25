import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { products } from "./products";
import { productVariants } from "./products";
import { stores } from "./stores";
import { users } from "./auth";

/**
 * "Hold" of a product for a specific customer at a specific store. "I'll set
 * one aside, pass by Thursday to pick it up." Distinct from an order — no
 * money has changed hands.
 */
export const productReservations = pgTable(
  "product_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    variantId: uuid("variant_id").references(() => productVariants.id),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    reservedByUserId: text("reserved_by_user_id")
      .notNull()
      .references(() => users.id),

    quantity: integer("quantity").notNull().default(1),
    holdUntil: timestamp("hold_until", { withTimezone: true }).notNull(),

    status: varchar("status", { length: 20 }).notNull().default("held"),
    // held | picked_up | expired | cancelled
    pickedUpAt: timestamp("picked_up_at", { withTimezone: true }),
    /** Set when status flips to picked_up — links the reservation to the order. */
    fulfilledOrderId: uuid("fulfilled_order_id"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("product_reservations_customer_idx").on(table.customerId),
    index("product_reservations_store_status_idx").on(table.storeId, table.status),
  ],
);
