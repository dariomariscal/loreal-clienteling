import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/**
 * Retail group hierarchy — Salesforce CGC Account pattern adapted to MX.
 *
 * Models the "franquicia" concept: Liverpool Polanco (store) →
 * Liverpool CDMX (region) → Liverpool (banner) → El Puerto de Liverpool
 * (retailer / holding). Self-referencing so the hierarchy can grow without
 * schema changes; `kind` is the discriminator reports group on
 * ("Top banners" vs "Top retailers" vs "Top regions").
 *
 * stores.banner remains as a denormalized cache for fast filtering; this
 * table is the source of truth for hierarchical roll-ups.
 */
export const retailGroups = pgTable(
  "retail_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull(),
    /** retailer | banner | region */
    kind: varchar("kind", { length: 20 }).notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => retailGroups.id),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("retail_groups_parent_idx").on(t.parentId),
    index("retail_groups_kind_idx").on(t.kind),
  ],
);
