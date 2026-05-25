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
import { users } from "./auth";
import { products } from "./products";
import { productVariants } from "./products";

/**
 * Wishlists / curated lookbooks. An advisor builds a small selection for a
 * specific customer and shares it via a tracking link; the customer can buy
 * from it and the order is attributed back to the advisor.
 *
 * Naming follows Shopify / Sephora convention ("wishlist") with the
 * "lookbook" sub-flavor captured in `kind`.
 */
export const wishlists = pgTable(
  "wishlists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id),
    name: varchar("name", { length: 200 }).notNull(),
    /** wishlist (long-lived) | lookbook (one-off curated share). */
    kind: varchar("kind", { length: 20 }).notNull().default("wishlist"),
    description: text("description"),
    sharedAt: timestamp("shared_at", { withTimezone: true }),
    sharedVia: varchar("shared_via", { length: 20 }), // whatsapp | sms | email | link
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("wishlists_customer_idx").on(table.customerId),
    index("wishlists_created_by_idx").on(table.createdByUserId),
  ],
);

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    wishlistId: uuid("wishlist_id")
      .notNull()
      .references(() => wishlists.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    variantId: uuid("variant_id").references(() => productVariants.id),
    note: text("note"),
    position: integer("position").notNull().default(0),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("wishlist_items_wishlist_idx").on(table.wishlistId)],
);
