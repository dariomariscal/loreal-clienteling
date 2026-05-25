import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { products } from "./products";
import { users } from "./auth";

/**
 * The customer's current daily routine. Modeled as line items so the advisor
 * can compare the routine against the catalog, suggest swaps, and detect
 * gaps. A routine item may reference an internal product OR a free-text
 * external product (the customer uses another brand).
 */
export const customerRoutines = pgTable(
  "customer_routines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),

    /** Time slot the step belongs to. */
    slot: varchar("slot", { length: 10 }).notNull(),
    // am | pm | weekly | monthly
    stepOrder: integer("step_order").notNull(),

    productId: uuid("product_id").references(() => products.id),
    /** When the customer uses a non-catalog product. */
    externalBrand: varchar("external_brand", { length: 100 }),
    externalProductName: varchar("external_product_name", { length: 200 }),

    addedByUserId: text("added_by_user_id")
      .notNull()
      .references(() => users.id),
    notes: text("notes"),

    isActive: boolean("is_active").notNull().default(true),
    sinceDate: timestamp("since_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("customer_routines_customer_slot_idx").on(table.customerId, table.slot),
  ],
);
