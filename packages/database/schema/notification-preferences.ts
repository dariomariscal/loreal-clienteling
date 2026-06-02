import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

/**
 * Per-user toggles for which notification kinds are delivered, and over
 * which channels. Composite PK on (userId, kind) — one row per kind per
 * user. Missing row means "use defaults", which the service computes from
 * a hard-coded table keyed by kind.
 *
 * Channel granularity (in_app, push) is intentional: a BA may want
 * birthdays in the bell icon but not as an OS-level push at 9am.
 */
export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Matches notifications.kind. */
    kind: varchar("kind", { length: 40 }).notNull(),

    inAppEnabled: boolean("in_app_enabled").notNull().default(true),
    pushEnabled: boolean("push_enabled").notNull().default(true),

    /** Optional quiet hours window — values like "22:00" / "07:00" (HH:MM). */
    quietHoursStart: varchar("quiet_hours_start", { length: 5 }),
    quietHoursEnd: varchar("quiet_hours_end", { length: 5 }),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.kind] })],
);
