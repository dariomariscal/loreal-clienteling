import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { serviceTypes } from "./service-types";

/**
 * Scheduling rules that override or refine defaults from service_types.
 * A row can scope to (store, service_type), (store, *), or (*, service_type)
 * via nullable FKs. More-specific rows win (store+service > store > service > global).
 *
 * Powers the booking engine when serving:
 *   - "Can this slot be booked?" (lead time, horizon, blackout dates)
 *   - "What slots should I show?" (granularity, working windows)
 *
 * Patterned after Salesforce Scheduler `WorkTypeGroup` policies and
 * Mindbody resource availability rules.
 */
export const schedulingPolicies = pgTable(
  "scheduling_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Null = applies to all stores. */
    storeId: uuid("store_id").references(() => stores.id, {
      onDelete: "cascade",
    }),
    /** Null = applies to all services. */
    serviceTypeId: uuid("service_type_id").references(() => serviceTypes.id, {
      onDelete: "cascade",
    }),

    /** Grid granularity for slot listing (minutes). 15 / 30 / 60. */
    slotGranularityMinutes: integer("slot_granularity_minutes")
      .notNull()
      .default(30),

    /** Per-policy override of service-level lead time / horizon. */
    minLeadTimeMinutes: integer("min_lead_time_minutes"),
    maxAdvanceDays: integer("max_advance_days"),

    /**
     * Days of week this policy is active. Bitmask via JSON for clarity:
     * { mon: true, tue: true, ... }. Null = every day.
     */
    activeDays: jsonb("active_days").$type<{
      mon?: boolean;
      tue?: boolean;
      wed?: boolean;
      thu?: boolean;
      fri?: boolean;
      sat?: boolean;
      sun?: boolean;
    }>(),

    /** Working window for this policy (local time, e.g. "10:00", "20:00"). */
    workWindowStart: varchar("work_window_start", { length: 5 }),
    workWindowEnd: varchar("work_window_end", { length: 5 }),

    /**
     * Blackout date ranges (vacations, store-wide closures). Array of
     * { from, to } ISO dates.
     */
    blackoutDates: jsonb("blackout_dates").$type<
      Array<{ from: string; to: string; reason?: string }>
    >(),

    /** Higher priority wins when multiple policies match. */
    priority: integer("priority").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),

    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("scheduling_policies_store_idx").on(table.storeId),
    index("scheduling_policies_service_idx").on(table.serviceTypeId),
  ],
);
