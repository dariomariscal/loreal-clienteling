import {
  pgTable,
  uuid,
  text,
  varchar,
  date,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { stores } from "./stores";

/**
 * Counter shift schedule. One row per user per calendar day per store.
 *
 * Powers two questions on the Counter Manager dashboard:
 *   - "Who is on shift HOW?" (today, right now)
 *   - "What does next week look like?" (calendar view)
 *
 * Off-days are represented by status='off' (no startTime/endTime) so the
 * weekly calendar can render gaps explicitly instead of inferring absence.
 */
export const shifts = pgTable(
  "shifts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),

    shiftDate: date("shift_date").notNull(),

    startTime: timestamp("start_time", { withTimezone: true }),
    endTime: timestamp("end_time", { withTimezone: true }),

    status: varchar("status", { length: 20 }).notNull().default("scheduled"),
    // scheduled | active | completed | off | vacation | sick

    notes: text("notes"),

    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("shifts_user_date_idx").on(table.userId, table.shiftDate),
    index("shifts_store_date_idx").on(table.storeId, table.shiftDate),
  ],
);
