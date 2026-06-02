import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { appointments } from "./appointments";
import { products, productVariants } from "./products";
import { users } from "./auth";

/**
 * Products the BA pre-selects ("pulls") for a specific appointment — the
 * "Ideabook" / "Look book" pattern (BSPK, Tulip). Curated SKUs the advisor
 * wants ready at the chair when the client arrives.
 *
 * Lifecycle:
 *   - prepared : selected by BA pre-appointment
 *   - shown    : actually shown to the client during the visit
 *   - tried    : client tried it on / sampled it
 *   - purchased: client bought it (links to line_item)
 *   - declined : client passed
 *
 * Captured here (not in pre_form jsonb) so we can run product-level reports
 * — "most-shown products in skincare consults", "highest try-to-buy ratio".
 */
export const appointmentPreparedProducts = pgTable(
  "appointment_prepared_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    variantId: uuid("variant_id").references(() => productVariants.id),

    /** Order in which the BA arranged the items. */
    position: integer("position").notNull().default(0),

    status: varchar("status", { length: 16 }).notNull().default("prepared"),
    // prepared | shown | tried | purchased | declined

    /** Free-text reason ("client likes pink undertones") for context. */
    note: text("note"),

    /** Who added it. Usually the same as appointment.staffUserId. */
    addedByUserId: text("added_by_user_id")
      .notNull()
      .references(() => users.id),

    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Timestamp set when status transitions to shown/tried/purchased/declined. */
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true }),
  },
  (table) => [
    index("appointment_prepared_products_appt_idx").on(table.appointmentId),
    index("appointment_prepared_products_product_idx").on(table.productId),
  ],
);
