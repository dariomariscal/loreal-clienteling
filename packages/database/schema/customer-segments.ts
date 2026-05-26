import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { brands } from "./brands";
import { divisions } from "./divisions";

/**
 * Saved customer segments / "smart lists". An advisor (owner) or a brand-wide
 * admin defines a filter; the system materializes membership lazily.
 *
 * Term "segment" matches Klaviyo / Salesforce Marketing Cloud / HubSpot —
 * dynamic membership defined by a filter. Static lists are a degenerate case
 * (filter referencing explicit ids).
 *
 * Scope precedence (most specific → broadest):
 *   ownerUserId set                          → personal segment of that user
 *   brandId set                              → shared inside that brand
 *   divisionId set                           → shared across every brand of that division (NRM-level)
 *   all three null                           → global (admin-defined)
 */
export const customerSegments = pgTable(
  "customer_segments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: text("owner_user_id").references(() => users.id),
    brandId: uuid("brand_id").references(() => brands.id),
    /** Set when a National Retail Manager creates a division-wide segment. */
    divisionId: uuid("division_id").references(() => divisions.id),

    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),

    /** Drizzle-side filter definition; resolved to SQL at query time. */
    filter: jsonb("filter").$type<Record<string, unknown>>().notNull(),
    /** false = static list of ids; true = re-evaluated dynamically. */
    isDynamic: boolean("is_dynamic").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("customer_segments_owner_idx").on(table.ownerUserId),
    index("customer_segments_brand_idx").on(table.brandId),
    index("customer_segments_division_idx").on(table.divisionId),
  ],
);
