import {
  pgTable,
  uuid,
  varchar,
  numeric,
  date,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { brands } from "./brands";
import { users } from "./auth";

/**
 * Sales targets per counter (storeId + brandId) for a period. A counter manager
 * sees "venta del día vs. objetivo" on the home screen — that is the only
 * reason this table exists. Two grains: `daily` (one row per calendar day) and
 * `monthly` (one row per month, prorated client-side if needed).
 */
export const salesTargets = pgTable(
  "sales_targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id),

    period: varchar("period", { length: 10 }).notNull(),
    // daily | monthly
    periodDate: date("period_date").notNull(),
    // For daily: the calendar day. For monthly: the first day of that month.

    targetAmount: numeric("target_amount", { precision: 14, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("MXN"),

    notes: text("notes"),

    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("sales_targets_counter_period_idx").on(
      table.storeId,
      table.brandId,
      table.period,
      table.periodDate,
    ),
    index("sales_targets_store_idx").on(table.storeId),
  ],
);
