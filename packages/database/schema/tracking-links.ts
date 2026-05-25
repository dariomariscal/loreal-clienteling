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
import { wishlists } from "./wishlists";

/**
 * Short URLs that an advisor shares with a customer (in WhatsApp, SMS, email)
 * pointing at a product, wishlist or service. Click + conversion tracking
 * is what makes sales attribution work end-to-end.
 */
export const trackingLinks = pgTable(
  "tracking_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Short code used in the URL path: /l/{shortCode}. */
    shortCode: varchar("short_code", { length: 20 }).notNull().unique(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id),
    customerId: uuid("customer_id").references(() => customers.id),
    productId: uuid("product_id").references(() => products.id),
    wishlistId: uuid("wishlist_id").references(() => wishlists.id),
    /** Destination URL after recording the click. */
    destinationUrl: text("destination_url").notNull(),
    /** Optional human label for the advisor's own analytics. */
    label: varchar("label", { length: 100 }),

    clicksCount: integer("clicks_count").notNull().default(0),
    lastClickedAt: timestamp("last_clicked_at", { withTimezone: true }),

    convertedOrderId: uuid("converted_order_id"),

    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("tracking_links_created_by_idx").on(table.createdByUserId),
    index("tracking_links_customer_idx").on(table.customerId),
  ],
);
