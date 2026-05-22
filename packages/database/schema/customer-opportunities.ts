import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { users } from "./auth";

/**
 * Daily queue of customers a BA should reach out to. Pre-computed nightly by
 * DailyOpportunitiesCron — the home screen ("hoy importan estas 5 clientas")
 * reads from here without invoking an LLM at request time.
 *
 * `reason` is a short code (replenishment | life_event | win_back | birthday |
 * vip_cadence | new_product_match). Free-text rationale lives in summary.
 */
export const customerOpportunities = pgTable(
  "customer_opportunities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    baUserId: text("ba_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    forDate: date("for_date").notNull(),
    reason: varchar("reason", { length: 32 }).notNull(),
    summary: text("summary").notNull(),
    suggestedAction: text("suggested_action").notNull(),
    suggestedMessageDraft: text("suggested_message_draft"),
    priority: integer("priority").notNull().default(0),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    actedAt: timestamp("acted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("customer_opportunities_ba_date_idx").on(table.baUserId, table.forDate),
    index("customer_opportunities_customer_idx").on(table.customerId),
  ],
);
