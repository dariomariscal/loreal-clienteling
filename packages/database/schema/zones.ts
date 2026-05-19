import { pgTable, uuid, varchar, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { municipalities } from "./municipalities";

export const zones = pgTable("zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  /** Hex color used for pins and badges. */
  color: varchar("color", { length: 7 }).notNull().default("#D4AF37"),
  /** Lucide icon name (e.g. "map-pin", "store"). */
  icon: varchar("icon", { length: 50 }).notNull().default("map-pin"),
  /** Free-text region label (legacy, kept for backwards compat). */
  region: varchar("region", { length: 200 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Many-to-many between zones and municipalities. A zone is the union of the
 * municipalities listed here. Stores are auto-assigned to a zone by matching
 * their `municipality_id` against this table.
 */
export const zoneMunicipalities = pgTable(
  "zone_municipalities",
  {
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => zones.id, { onDelete: "cascade" }),
    municipalityId: varchar("municipality_id", { length: 5 })
      .notNull()
      .references(() => municipalities.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.zoneId, t.municipalityId] }),
    municipalityIdx: index("zone_municipalities_municipality_idx").on(t.municipalityId),
  }),
);
