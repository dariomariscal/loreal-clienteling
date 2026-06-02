import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";
import { brands } from "./brands";

/**
 * Catalog of appointment / service offerings (skin diagnostic, color match,
 * makeup for event, fragrance discovery, masterclass…). Industry term in
 * salon / beauty SaaS is "service" or "service type" — not "event type".
 */
export const serviceTypes = pgTable("service_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 30 }).notNull().unique(),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  durationMinutes: integer("duration_minutes").default(60),
  /**
   * Buffer time before / after the appointment that blocks the BA's calendar
   * but is invisible to the customer. Used for setup, cleanup, notes, and
   * sanitization. Mindbody / Salesforce Scheduler convention.
   */
  bufferBeforeMinutes: integer("buffer_before_minutes").notNull().default(0),
  bufferAfterMinutes: integer("buffer_after_minutes").notNull().default(0),
  /**
   * Optional list price for the service (e.g. Sephora $30 / $60 / $90).
   * Null for complimentary services. Currency follows store / order context.
   */
  price: numeric("price", { precision: 10, scale: 2 }),
  color: varchar("color", { length: 20 }),
  description: text("description"),
  brandId: uuid("brand_id").references(() => brands.id),
  maxCapacity: integer("max_capacity").default(1),
  requiresConfirmation: boolean("requires_confirmation")
    .notNull()
    .default(false),
  /**
   * Minimum lead time before the appointment can be booked, in minutes.
   * E.g. 120 means "no booking less than 2h ahead".
   */
  minLeadTimeMinutes: integer("min_lead_time_minutes").notNull().default(0),
  /**
   * Maximum days ahead a booking is accepted (Sephora opens 90 days).
   */
  maxAdvanceDays: integer("max_advance_days").notNull().default(90),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
