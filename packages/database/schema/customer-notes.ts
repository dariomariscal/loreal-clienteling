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

export const customerNotes = pgTable(
  "customer_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    /** Optional pivot: a note that references a specific product. */
    productId: uuid("product_id").references(() => products.id),
    /** Private notes are visible only to the author + admins. */
    private: boolean("private").notNull().default(false),
    authorUserId: text("author_user_id")
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
    index("customer_notes_customer_idx").on(table.customerId),
    index("customer_notes_author_idx").on(table.authorUserId),
  ],
);
