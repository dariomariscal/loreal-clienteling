import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { storeEvents } from "./store-events";
import { users } from "./auth";

/**
 * Which Beauty Advisors are working a given store event. Distinct from
 * `event_invitations` (those track customers). The Counter Manager assigns
 * the staff lineup for masterclasses, launches, etc.
 */
export const eventAssignments = pgTable(
  "event_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeEventId: uuid("store_event_id")
      .notNull()
      .references(() => storeEvents.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    role: varchar("role", { length: 30 }).notNull().default("staff"),
    // lead | staff | mua | host

    assignedByUserId: text("assigned_by_user_id")
      .notNull()
      .references(() => users.id),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("event_assignments_event_user_idx").on(
      table.storeEventId,
      table.userId,
    ),
    index("event_assignments_user_idx").on(table.userId),
  ],
);
