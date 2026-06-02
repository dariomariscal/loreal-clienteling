import {
  pgTable,
  uuid,
  text,
  varchar,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { users } from "./auth";
import { customerVisits } from "./customer-visits";

/**
 * Photos and media captured during consultations: before / after shots,
 * shade swatches, skin scans, finished looks. Stored as references — the
 * binaries live in object storage (R2).
 */
export const customerMedia = pgTable(
  "customer_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id"),
    /** Visit during which the media was captured, if any. */
    visitId: uuid("visit_id").references(() => customerVisits.id, {
      onDelete: "set null",
    }),
    capturedByUserId: text("captured_by_user_id")
      .notNull()
      .references(() => users.id),

    kind: varchar("kind", { length: 20 }).notNull(),
    // before | after | swatch | skin_scan | look | document
    mediaType: varchar("media_type", { length: 20 }).notNull().default("image"),
    // image | video
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    caption: text("caption"),
    tags: jsonb("tags").$type<string[]>(),

    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("customer_media_customer_idx").on(table.customerId),
    index("customer_media_appointment_idx").on(table.appointmentId),
    index("customer_media_visit_idx").on(table.visitId),
  ],
);
