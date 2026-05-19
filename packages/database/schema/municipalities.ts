import { pgTable, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { multiPolygon } from "./_types";

/**
 * Mexican municipalities and CDMX boroughs ("alcaldías"), seeded from INEGI.
 * PK is the INEGI code: 2-digit state + 3-digit municipality (e.g. "09015" = Cuauhtémoc).
 * `boundary` is the official polygon used for point-in-polygon lookups and map rendering.
 */
export const municipalities = pgTable(
  "municipalities",
  {
    id: varchar("id", { length: 5 }).primaryKey(),
    stateCode: varchar("state_code", { length: 2 }).notNull(),
    stateName: varchar("state_name", { length: 100 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    boundary: multiPolygon("boundary").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    stateIdx: index("municipalities_state_idx").on(t.stateCode),
    boundaryIdx: index("municipalities_boundary_gix").using("gist", t.boundary),
  }),
);
