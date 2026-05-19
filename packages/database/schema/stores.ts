import {
  pgTable,
  uuid,
  varchar,
  boolean,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { zones } from "./zones";

export const stores = pgTable("stores", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  chain: varchar("chain", { length: 20 }).notNull(), // liverpool | palacio | owned
  zoneId: uuid("zone_id").references(() => zones.id),
  address: varchar("address", { length: 500 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  lat: numeric("lat", { precision: 10, scale: 7 }),
  lng: numeric("lng", { precision: 10, scale: 7 }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
