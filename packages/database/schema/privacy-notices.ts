import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Versioned privacy notices (Aviso de Privacidad) that customers accept at
 * registration. The active notice is the row with the latest `effectiveFrom`
 * that is not yet superseded (effectiveTo is null or in the future).
 *
 * LFPDPPP requires keeping every prior version because consents reference the
 * exact version the customer agreed to. Never delete rows — supersede them.
 */
export const privacyNotices = pgTable(
  "privacy_notices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    version: varchar("version", { length: 20 }).notNull(),
    language: varchar("language", { length: 10 }).notNull().default("es-MX"),
    title: varchar("title", { length: 200 }).notNull(),
    bodyMarkdown: text("body_markdown").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true })
      .notNull()
      .defaultNow(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("privacy_notices_version_lang_idx").on(
      table.version,
      table.language,
    ),
    index("privacy_notices_active_idx").on(table.language, table.effectiveFrom),
  ],
);
