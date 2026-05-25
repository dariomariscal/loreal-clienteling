import {
  pgTable,
  uuid,
  text,
  varchar,
  numeric,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { stores } from "./stores";
import { users } from "./auth";
import { products } from "./products";

/**
 * Orders — purchases by a customer. Field names follow the Shopify /
 * Salesforce Commerce convention so anyone integrating downstream
 * (Klaviyo, Segment, BI) can map 1:1.
 */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Human-readable sequential identifier shown on receipts ("#10453"). */
    orderNumber: varchar("order_number", { length: 30 }).notNull().unique(),

    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),

    /** Where the order was placed. */
    channel: varchar("channel", { length: 20 }).notNull().default("in_store"),
    // in_store | online | mobile_app | whatsapp_link | clienteling_link
    sourceName: varchar("source_name", { length: 50 }), // pos_integration | manual | ecommerce | shopify | sap
    /** POS / external order id for reconciliation. */
    externalOrderId: varchar("external_order_id", { length: 100 }),

    currency: varchar("currency", { length: 3 }).notNull().default("MXN"),

    // Money breakdown (Shopify standard).
    subtotalPrice: numeric("subtotal_price", { precision: 12, scale: 2 }).notNull(),
    totalTax: numeric("total_tax", { precision: 12, scale: 2 }).notNull().default("0"),
    totalDiscounts: numeric("total_discounts", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    totalShipping: numeric("total_shipping", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),

    financialStatus: varchar("financial_status", { length: 20 })
      .notNull()
      .default("paid"),
    // pending | paid | partially_refunded | refunded | voided
    fulfillmentStatus: varchar("fulfillment_status", { length: 20 })
      .notNull()
      .default("fulfilled"),
    // unfulfilled | partial | fulfilled | restocked

    // Clienteling attribution — which BA gets credit for this order.
    attributedUserId: text("attributed_user_id").references(() => users.id),
    attributionSource: varchar("attribution_source", { length: 30 }),
    // last_consultation | active_recommendation | direct_assistance | tracking_link | appointment

    processedAt: timestamp("processed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("orders_customer_idx").on(table.customerId),
    index("orders_store_idx").on(table.storeId),
    index("orders_attributed_idx").on(table.attributedUserId),
    index("orders_processed_idx").on(table.processedAt),
  ],
);

export const lineItems = pgTable(
  "line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    sku: varchar("sku", { length: 100 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    variantTitle: varchar("variant_title", { length: 200 }),
    quantity: integer("quantity").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    totalDiscount: numeric("total_discount", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
  },
  (table) => [index("line_items_order_idx").on(table.orderId)],
);
