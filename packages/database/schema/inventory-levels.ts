import {
  pgTable,
  uuid,
  integer,
  varchar,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { products } from "./products";
import { productVariants } from "./products";
import { stores } from "./stores";

/**
 * Per-store inventory levels. Mirrors Shopify's `InventoryLevel` resource.
 *
 * A product may or may not have variants — `variantId` is nullable for the
 * "single-variant product" case.
 */
export const inventoryLevels = pgTable(
  "inventory_levels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, {
      onDelete: "cascade",
    }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),

    availableQuantity: integer("available_quantity").notNull().default(0),
    committedQuantity: integer("committed_quantity").notNull().default(0),
    incomingQuantity: integer("incoming_quantity").notNull().default(0),

    /** Derived status: available | low | out_of_stock. */
    stockStatus: varchar("stock_status", { length: 20 }).notNull(),

    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("inventory_levels_product_variant_store_idx").on(
      table.productId,
      table.variantId,
      table.storeId,
    ),
    index("inventory_levels_store_idx").on(table.storeId),
  ],
);
