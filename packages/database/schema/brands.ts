import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { divisions } from "./divisions";

export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  tier: varchar("tier", { length: 20 }).notNull(), // luxury | premium | mass
  /**
   * L'Oréal division this brand belongs to (luxe, consumer, active,
   * professional). Drives scope for Area Managers and National Retail
   * Managers, who operate per-division rather than per-brand.
   */
  divisionId: uuid("division_id").references(() => divisions.id),
  logoUrl: varchar("logo_url", { length: 500 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
