import {
  pgTable,
  uuid,
  text,
  integer,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { users } from "./auth";
import { stores } from "./stores";
import { appointments } from "./appointments";

/**
 * Per-interaction Beauty Advisor rating. Customer-submitted (post-visit
 * micro-survey) or manager-attested (call review). NPS is computed from `score`
 * (0–10) with the standard {promoters - detractors} formula in the analytics
 * layer — we keep raw ratings here.
 *
 * Optional `appointmentId` ties a rating to a specific visit; standalone
 * ratings (e.g. from a generic post-visit SMS) leave it null.
 */
export const baRatings = pgTable(
  "ba_ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    reviewedUserId: text("reviewed_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    appointmentId: uuid("appointment_id").references(() => appointments.id),

    score: integer("score").notNull(), // 0..10
    comment: text("comment"),

    source: varchar("source", { length: 30 }).notNull(),
    // post_visit_survey | whatsapp_survey | manager_attested | counter_kiosk

    submittedByUserId: text("submitted_by_user_id").references(() => users.id),
    // Null = customer self-submitted; set when a manager or BA records it on
    // behalf of the customer.

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ba_ratings_reviewed_user_idx").on(table.reviewedUserId),
    index("ba_ratings_store_created_idx").on(table.storeId, table.createdAt),
    index("ba_ratings_customer_idx").on(table.customerId),
  ],
);
