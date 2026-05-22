import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { users } from "./auth";

/**
 * Bidirectional message log.
 *
 * Outbound (BA → customer): `direction = "outbound"`, `sentByUserId` set,
 * `followupType` typically set. Lifecycle moves queued → sending → sent →
 * delivered → read.
 *
 * Inbound (customer → BA): `direction = "inbound"`, `sentByUserId` null,
 * `followupType` null, ingested by provider webhook. Status is usually
 * `received` from the moment we accept it.
 *
 * Naming and lifecycle follow the Twilio / WhatsApp Business industry
 * standard so any provider integration maps without translation.
 */
export const communications = pgTable(
  "communications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),

    // Inbound messages have no BA author. Outbound messages always do.
    sentByUserId: text("sent_by_user_id").references(() => users.id),

    direction: varchar("direction", { length: 12 }).notNull().default("outbound"),
    channel: varchar("channel", { length: 20 }).notNull(), // whatsapp | sms | email
    status: varchar("status", { length: 16 }).notNull().default("sent"),

    // The address each side of the message used. Nullable because legacy rows
    // were stored without them and future migrations can backfill from
    // customer profile + store config.
    fromAddress: varchar("from_address", { length: 320 }),
    toAddress: varchar("to_address", { length: 320 }),

    // Provider message id (Twilio SID, WhatsApp wamid, etc). Indexed unique
    // so webhooks are idempotent and a re-delivery doesn't double-insert.
    externalId: varchar("external_id", { length: 128 }),

    templateId: uuid("template_id"),
    subject: varchar("subject", { length: 200 }),
    body: text("body").notNull(),

    // Only meaningful for outbound campaign-style messages. Inbound = null.
    followupType: varchar("followup_type", { length: 30 }),
    failureReason: text("failure_reason"),

    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    trackingLinkId: uuid("tracking_link_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("communications_customer_idx").on(table.customerId),
    index("communications_customer_sent_idx").on(table.customerId, table.sentAt),
    index("communications_external_id_idx").on(table.externalId),
    index("communications_direction_status_idx").on(table.direction, table.status),
  ],
);
