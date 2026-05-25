import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { users } from "./auth";

/**
 * Bidirectional message log across channels (WhatsApp, SMS, email).
 *
 * Outbound (advisor → customer): `direction = "outbound"`, `sentByUserId` set.
 * Inbound (customer → advisor): `direction = "inbound"`, `sentByUserId` null.
 *
 * Field names mirror Twilio / WhatsApp Business API so provider integrations
 * map without translation.
 */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    sentByUserId: text("sent_by_user_id").references(() => users.id),

    direction: varchar("direction", { length: 12 }).notNull().default("outbound"),
    // inbound | outbound
    channel: varchar("channel", { length: 20 }).notNull(),
    // whatsapp | sms | email | in_app
    status: varchar("status", { length: 16 }).notNull().default("sent"),
    // queued | sending | sent | delivered | read | failed | received

    fromAddress: varchar("from_address", { length: 320 }),
    toAddress: varchar("to_address", { length: 320 }),

    /** Provider message id (Twilio SID, WhatsApp wamid). Used for idempotent webhooks. */
    providerMessageId: varchar("provider_message_id", { length: 128 }),

    templateId: uuid("template_id"),
    subject: varchar("subject", { length: 200 }),
    body: text("body").notNull(),
    /** Attached product cards, lookbook ids, media urls, etc. */
    attachments: jsonb("attachments").$type<{
      productIds?: string[];
      wishlistId?: string;
      mediaUrls?: string[];
      trackingLinkId?: string;
    }>(),

    /** Lifecycle origin. Mirrors Klaviyo's "flow trigger" / campaign type. */
    campaignType: varchar("campaign_type", { length: 30 }),
    // birthday | replenishment | win_back | new_launch | post_purchase | appointment_reminder | abandoned_cart | manual

    /** Optional links back to the source of the outreach. */
    appointmentId: uuid("appointment_id"),
    suggestedActionId: uuid("suggested_action_id"),
    trackingLinkId: uuid("tracking_link_id"),

    failureReason: text("failure_reason"),

    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("messages_customer_idx").on(table.customerId),
    index("messages_customer_sent_idx").on(table.customerId, table.sentAt),
    index("messages_provider_message_id_idx").on(table.providerMessageId),
    index("messages_direction_status_idx").on(table.direction, table.status),
  ],
);
