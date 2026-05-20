import {
  pgTable,
  uuid,
  varchar,
  boolean,
  numeric,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { zones } from "./zones";
import { municipalities } from "./municipalities";
import { point } from "./_types";

/**
 * Free-form opening hours payload. Keys are day ranges like "mon-sun" or
 * "mon-fri"/"sat"/"sun" so we can render and reason about schedules without
 * locking into a per-day shape upfront.
 */
export interface StoreHours {
  store?: Record<string, string>;
  clickCollect?: Record<string, string>;
  access?: string;
}

export const stores = pgTable(
  "stores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    chain: varchar("chain", { length: 20 }).notNull(), // liverpool | palacio | owned
    /** Auto-derived from geom via trigger when null; can be overridden manually. */
    zoneId: uuid("zone_id").references(() => zones.id),
    address: varchar("address", { length: 500 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 100 }),
    /** Alcaldía / colonia label from Mapbox (e.g. "Miguel Hidalgo"). */
    district: varchar("district", { length: 100 }),
    /** INEGI 5-digit code; derived server-side by trigger from geom. */
    municipalityId: varchar("municipality_id", { length: 5 }).references(
      () => municipalities.id,
    ),
    postcode: varchar("postcode", { length: 10 }),
    /** Decimal copies kept for client-side display without an SQL roundtrip. */
    lat: numeric("lat", { precision: 10, scale: 7 }),
    lng: numeric("lng", { precision: 10, scale: 7 }),
    /** Canonical spatial location. Filled by trigger when lat/lng change. */
    geom: point("geom"),
    phone: varchar("phone", { length: 20 }),
    hours: jsonb("hours").$type<StoreHours>(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    municipalityIdx: index("stores_municipality_idx").on(t.municipalityId),
    geomIdx: index("stores_geom_gix").using("gist", t.geom),
  }),
);
