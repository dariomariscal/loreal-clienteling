import {
  pgTable,
  uuid,
  varchar,
  numeric,
  integer,
  jsonb,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { brands } from "./brands";

export const brandConfigs = pgTable("brand_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id")
    .notNull()
    .unique()
    .references(() => brands.id),
  primaryColor: varchar("primary_color", { length: 20 }),
  secondaryColor: varchar("secondary_color", { length: 20 }),
  accentColor: varchar("accent_color", { length: 20 }),
  logoUrl: varchar("logo_url", { length: 500 }),
  fontFamily: varchar("font_family", { length: 100 }),
  replenishmentRules: jsonb("replenishment_rules"),
  isVirtualTryonEnabled: boolean("is_virtual_tryon_enabled")
    .notNull()
    .default(false),
  vipThresholdAmount: numeric("vip_threshold_amount", {
    precision: 12,
    scale: 2,
  }),
  vipThresholdPeriodMonths: integer("vip_threshold_period_months").default(12),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
