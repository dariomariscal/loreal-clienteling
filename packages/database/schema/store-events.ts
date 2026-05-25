import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { brands } from "./brands";
import { customers } from "./customers";
import { users } from "./auth";

/**
 * Store events (masterclass, brand launch, VIP preview, fragrance discovery).
 * Distinct from 1:1 appointments — these are group events at a store the
 * advisor invites customers to.
 */
export const storeEvents = pgTable(
  "store_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    brandId: uuid("brand_id").references(() => brands.id),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    kind: varchar("kind", { length: 30 }).notNull(),
    // masterclass | launch | vip_preview | trunk_show | discovery
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    capacity: integer("capacity"),
    coverImageUrl: varchar("cover_image_url", { length: 500 }),
    status: varchar("status", { length: 20 }).notNull().default("scheduled"),
    // scheduled | live | completed | cancelled
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("store_events_store_start_idx").on(table.storeId, table.startTime)],
);

/**
 * Per-customer invitation to a store event. Tracks RSVP and attendance.
 */
export const eventInvitations = pgTable(
  "event_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeEventId: uuid("store_event_id")
      .notNull()
      .references(() => storeEvents.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => users.id),
    rsvpStatus: varchar("rsvp_status", { length: 20 }).notNull().default("pending"),
    // pending | accepted | declined | waitlist
    rsvpAt: timestamp("rsvp_at", { withTimezone: true }),
    attendedAt: timestamp("attended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("event_invitations_event_idx").on(table.storeEventId),
    index("event_invitations_customer_idx").on(table.customerId),
  ],
);
