import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";

/**
 * Cached 3-line AI summary shown at the top of a customer's profile.
 * Regenerated on demand or when underlying data (notes, purchases) changes.
 * `expires_at` lets us TTL summaries even when no data changed, so stale
 * context never leaks into the advisor's UI.
 */
export const customerAiSummaries = pgTable("customer_ai_summaries", {
  customerId: uuid("customer_id")
    .primaryKey()
    .references(() => customers.id, { onDelete: "cascade" }),
  summaryText: text("summary_text").notNull(),
  model: varchar("model", { length: 64 }).notNull(),
  promptVersion: varchar("prompt_version", { length: 32 }).notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
