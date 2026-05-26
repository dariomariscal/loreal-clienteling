import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * L'Oréal global divisions. Every brand belongs to exactly one division;
 * Area Managers and National Retail Managers are scoped to a division, not
 * to an individual brand. Seeded with the four canonical divisions:
 *
 *   luxe          → Lancôme, YSL Beauté, Kiehl's, Armani, Valentino, Prada, …
 *   consumer      → L'Oréal Paris, Maybelline, Garnier, NYX
 *   active        → La Roche-Posay, Vichy, SkinCeuticals, CeraVe
 *   professional  → Kérastase, Redken, L'Oréal Professionnel
 *
 * Codes are stable identifiers used both as URL slugs and as the value stored
 * on `users.division_id` references (kept as text in users since users.id is
 * Clerk-issued text and we want the column types to match the foreign world).
 */
export const divisions = pgTable("divisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 30 }).notNull().unique(),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
