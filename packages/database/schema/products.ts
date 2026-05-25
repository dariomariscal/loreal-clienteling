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

/**
 * Products — master catalog. Field names follow the Shopify convention
 * (title, vendor, product_type, tags, variants) so downstream pipelines
 * can map without translation.
 */
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sku: varchar("sku", { length: 100 }).notNull().unique(),
    /** GTIN / EAN / UPC. Schema.org standard. */
    barcode: varchar("barcode", { length: 50 }),

    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id),

    title: varchar("title", { length: 300 }).notNull(),
    description: text("description"),
    /** Shopify-style high-level type: "Foundation", "Serum", "Lipstick". */
    productType: varchar("product_type", { length: 50 }),
    /** High-level category: skincare | makeup | fragrance | haircare | bodycare | tools | gift_set. */
    category: varchar("category", { length: 20 }).notNull(),
    /** Fine-grained sub-category. */
    subcategory: varchar("subcategory", { length: 50 }),
    /** Free-form tags for filtering, segmentation, merchandising. */
    tags: jsonb("tags").$type<string[]>(),

    /** Marketing claims (vegan, cruelty_free, paraben_free, dermatologically_tested, fragrance_free). */
    claims: jsonb("claims").$type<string[]>(),
    /** Skin / hair concerns this product targets. Matches beautyProfiles.skinConcerns. */
    targetConcerns: jsonb("target_concerns").$type<string[]>(),
    /** Format: cream | serum | oil | spray | stick | gel | powder | foam | balm. */
    formatType: varchar("format_type", { length: 30 }),

    ingredients: jsonb("ingredients").$type<string[]>(),
    images: jsonb("images").$type<string[]>(),

    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    /** Shopify-style strike-through price. */
    compareAtPrice: numeric("compare_at_price", { precision: 10, scale: 2 }),
    currency: varchar("currency", { length: 3 }).notNull().default("MXN"),

    weight: numeric("weight", { precision: 8, scale: 3 }),
    weightUnit: varchar("weight_unit", { length: 5 }).default("g"),

    /** Days the product typically lasts a single user — drives replenishment alerts. */
    replenishmentDays: integer("replenishment_days"),

    technicalSheetUrl: varchar("technical_sheet_url", { length: 500 }),
    tutorialUrl: varchar("tutorial_url", { length: 500 }),
    /** Short selling argument the advisor can quote. */
    talkingPoints: text("talking_points"),

    /** Shopify-style: active | draft | archived. */
    status: varchar("status", { length: 20 }).notNull().default("active"),

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
    index("products_product_type_idx").on(table.productType),
  ],
);

/**
 * Product variants — one row per shade / size / format that ships as its own
 * SKU. Mirrors Shopify's Variant model.
 */
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: varchar("sku", { length: 100 }).notNull().unique(),
    title: varchar("title", { length: 200 }).notNull(), // "220N Buff Neutral" / "50ml"
    /** Generic option triplet (Shopify standard). */
    option1: varchar("option1", { length: 100 }), // e.g. shade
    option2: varchar("option2", { length: 100 }), // e.g. size
    option3: varchar("option3", { length: 100 }),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    compareAtPrice: numeric("compare_at_price", { precision: 10, scale: 2 }),
    barcode: varchar("barcode", { length: 50 }),
    imageUrl: varchar("image_url", { length: 500 }),
    /** Hex color for swatch rendering when the variant is a shade. */
    swatchHex: varchar("swatch_hex", { length: 7 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("product_variants_product_idx").on(table.productId)],
);
