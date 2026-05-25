import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { products } from "./products";
import { users } from "./auth";

/**
 * Free-form notes attached to a customer. CRM-standard pattern (Salesforce
 * `Note`, HubSpot `notes`, Microsoft Dynamics `annotation`).
 */
export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    /** Optional pivot: a note that references a specific product. */
    productId: uuid("product_id").references(() => products.id),
    /** Private notes are visible only to the author + admins. */
    isPrivate: boolean("is_private").notNull().default(false),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notes_customer_idx").on(table.customerId),
    index("notes_created_by_idx").on(table.createdByUserId),
  ],
);
