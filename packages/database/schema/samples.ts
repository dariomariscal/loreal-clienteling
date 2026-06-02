import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { products, productVariants } from "./products";
import { users } from "./auth";
import { stores } from "./stores";
import { customerVisits } from "./customer-visits";

/**
 * Free product samples handed to a customer. Beauty-industry standard term;
 * conversion tracking ties samples back to follow-up orders.
 */
export const samples = pgTable(
  "samples",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    /** Specific variant (shade/size) handed out, when known. */
    variantId: uuid("variant_id").references(() => productVariants.id),
    deliveredByUserId: text("delivered_by_user_id")
      .notNull()
      .references(() => users.id),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    /** The visit during which the sample was handed out, if known. */
    visitId: uuid("visit_id").references(() => customerVisits.id, {
      onDelete: "set null",
    }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    isConverted: boolean("is_converted").notNull().default(false),
    convertedOrderId: uuid("converted_order_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("samples_customer_idx").on(table.customerId),
    index("samples_store_idx").on(table.storeId),
    index("samples_visit_idx").on(table.visitId),
  ],
);
