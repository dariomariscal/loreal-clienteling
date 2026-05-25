import {
  pgTable,
  uuid,
  text,
  varchar,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { brands } from "./brands";
import { users } from "./auth";

export const beautyProfiles = pgTable("beauty_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .unique()
    .references(() => customers.id, { onDelete: "cascade" }),

  // Skin
  skinType: varchar("skin_type", { length: 20 }), // dry | oily | combination | sensitive | normal
  skinTone: varchar("skin_tone", { length: 20 }), // fair | light | medium | tan | deep
  /** Dermatological standard. 1 (always burns) — 6 (never burns). */
  fitzpatrickScale: varchar("fitzpatrick_scale", { length: 3 }), // I | II | III | IV | V | VI
  undertone: varchar("undertone", { length: 20 }), // cool | neutral | warm
  skinConcerns: jsonb("skin_concerns").$type<string[]>(), // acne | rosacea | melasma | wrinkles | dark_spots | dryness | sensitivity
  preferredIngredients: jsonb("preferred_ingredients").$type<string[]>(),
  avoidedIngredients: jsonb("avoided_ingredients").$type<string[]>(),

  // Hair
  hairType: varchar("hair_type", { length: 20 }), // straight | wavy | curly | coily
  hairTexture: varchar("hair_texture", { length: 20 }), // fine | medium | coarse
  hairColorCurrent: varchar("hair_color_current", { length: 50 }),
  lastColorTreatmentAt: timestamp("last_color_treatment_at", {
    withTimezone: true,
  }),

  // Fragrance & makeup
  fragranceFamilies: jsonb("fragrance_families").$type<string[]>(), // floral | oriental | woody | fresh | citrus | gourmand
  makeupPreferences: jsonb("makeup_preferences").$type<{
    coverage?: "light" | "medium" | "full";
    finish?: "matte" | "satin" | "dewy";
    style?: string[];
  }>(),

  interests: jsonb("interests").$type<string[]>(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Customer's exact shade matches per product category. Mirrors the
 * "My Shades" pattern from Sephora / Ulta — what foundation shade, what
 * lipstick code — so reorders never miss.
 */
export const shadeMatches = pgTable("shade_matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  beautyProfileId: uuid("beauty_profile_id")
    .notNull()
    .references(() => beautyProfiles.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 20 }).notNull(), // foundation | concealer | lipstick | blush | bronzer
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id),
  productId: uuid("product_id").notNull(), // FK declared in products.ts to avoid circular import
  shadeCode: varchar("shade_code", { length: 50 }).notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  capturedByUserId: text("captured_by_user_id")
    .notNull()
    .references(() => users.id),
});
