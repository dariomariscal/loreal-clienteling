import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
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
  color: varchar("color", { length: 20 }),
  description: text("description"),
  brandId: uuid("brand_id").references(() => brands.id),
  maxCapacity: integer("max_capacity").default(1),
  requiresConfirmation: boolean("requires_confirmation")
    .notNull()
    .default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
