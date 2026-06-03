import {
  pgTable,
  uuid,
  varchar,
  numeric,
  date,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { brands } from "./brands";
import { users } from "./auth";

/**
 * Polymorphic targets — Salesforce `Goal` + `GoalMetric` pattern flattened.
 *
 * One row per (owner, metric, period). The owner is polymorphic so the same
 * table covers:
 *   - counter targets (storeId + brandId) — the original use case
 *   - BA targets (ownerUserId) — for "objetivo semanal de citas por BA"
 *   - area / store / national targets
 *
 * `metricKind` discriminates what the target measures and which actuals query
 * runs against it. Adding a new metric (e.g. `follow_ups_completed`) is
 * config-only; no schema change.
 *
 * Table name is kept as `sales_targets` for backward compatibility — original
 * rows live alongside new polymorphic ones. Use `metricKind` to filter.
 */
export const salesTargets = pgTable(
  "sales_targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // ---- Polymorphic owner ----
    /** counter | user | store | area */
    ownerType: varchar("owner_type", { length: 20 }).notNull().default("counter"),
    /** Set when ownerType in ('counter','store','area'). */
    storeId: uuid("store_id").references(() => stores.id),
    /** Set when ownerType='counter'. */
    brandId: uuid("brand_id").references(() => brands.id),
    /** Set when ownerType='user' (BA / counter_manager / area_manager). */
    ownerUserId: text("owner_user_id").references(() => users.id),

    // ---- What this target measures ----
    /**
     * sales_amount | sales_units | appointments_booked | appointments_completed
     * | follow_ups_completed | new_customers | samples_given | visits
     */
    metricKind: varchar("metric_kind", { length: 30 })
      .notNull()
      .default("sales_amount"),

    // ---- Period ----
    /** daily | weekly | monthly | quarterly */
    periodKind: varchar("period_kind", { length: 10 }).notNull().default("monthly"),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),

    // ---- The target itself ----
    targetValue: numeric("target_value", { precision: 14, scale: 2 }).notNull(),
    /** Only meaningful when metricKind is sales_amount / sales_units. */
    currency: varchar("currency", { length: 3 }).default("MXN"),

    /** Roll-up: a store-level target can have child BA-level rows. */
    parentTargetId: uuid("parent_target_id"),

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
    index("targets_owner_idx").on(
      table.ownerType,
      table.storeId,
      table.brandId,
      table.ownerUserId,
    ),
    index("targets_period_idx").on(table.periodStart, table.periodEnd),
    index("targets_metric_kind_idx").on(table.metricKind),
    index("targets_parent_idx").on(table.parentTargetId),
  ],
);
