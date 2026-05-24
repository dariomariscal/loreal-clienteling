import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { brands } from "./brands";
import { stores } from "./stores";

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sku: varchar("sku", { length: 100 }).notNull().unique(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id),
    name: varchar("name", { length: 300 }).notNull(),
    category: varchar("category", { length: 20 }).notNull(), // skincare | makeup | fragrance
    subcategory: varchar("subcategory", { length: 50 }),
    description: text("description"),
    ingredients: jsonb("ingredients").$type<string[]>(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    images: jsonb("images").$type<string[]>(),
    shadeOptions: jsonb("shade_options"),
    estimatedDurationDays: integer("estimated_duration_days"),
    technicalSheetUrl: varchar("technical_sheet_url", { length: 500 }),
    tutorialUrl: varchar("tutorial_url", { length: 500 }),
    salesArgument: text("sales_argument"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("products_brand_idx").on(table.brandId),
    index("products_category_idx").on(table.category),
  ],
);

export const productAvailability = pgTable("product_availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id),
  stockStatus: varchar("stock_status", { length: 20 }).notNull(), // available | low | out_of_stock
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
