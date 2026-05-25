import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { brands } from "./brands";

export const messageTemplates = pgTable("message_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id").references(() => brands.id), // null = global template
  name: varchar("name", { length: 200 }).notNull(),
  channel: varchar("channel", { length: 20 }).notNull(), // whatsapp | sms | email
  body: text("body").notNull(),
  /** Matches messages.campaignType — birthday | replenishment | win_back | ... */
  campaignType: varchar("campaign_type", { length: 30 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
