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
import { products } from "./products";
import { serviceTypes } from "./service-types";

/**
 * Daily queue of suggested actions per advisor — the "Next Best Action"
 * pattern (Salesforce NBA, Microsoft Dynamics, Tulip clienteling).
 *
 * Pre-computed nightly so the home screen ("today these 5 customers matter")
 * renders without invoking an LLM at request time. `triggerType` is a short
 * code; the free-text rationale lives in `description`.
 */
export const suggestedActions = pgTable(
  "suggested_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    assignedToUserId: text("assigned_to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    dueDate: date("due_date").notNull(),

    triggerType: varchar("trigger_type", { length: 32 }).notNull(),
    // replenishment | life_event | win_back | birthday | vip_cadence
    // | new_product_match | abandoned_cart | post_purchase
    // | sample_follow_up | wishlist_back_in_stock | wishlist_price_drop
    // | reservation_expiring

    description: text("description").notNull(),
    recommendedAction: text("recommended_action").notNull(),
    suggestedMessageDraft: text("suggested_message_draft"),

    /** Optional pointers to what the suggestion is about. */
    productId: uuid("product_id").references(() => products.id),
    serviceTypeId: uuid("service_type_id").references(() => serviceTypes.id),

    priority: integer("priority").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("suggested_actions_assignee_due_idx").on(
      table.assignedToUserId,
      table.dueDate,
    ),
    index("suggested_actions_customer_idx").on(table.customerId),
  ],
);
