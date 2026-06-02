import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { productVariants } from "./products";
import { customers } from "./customers";
import { stores } from "./stores";

/**
 * Every barcode/SKU scan performed by a Beauty Advisor on the floor.
 * Drives "X products scanned today, Y converted" telemetry on dashboards
 * and feeds the Counter Manager / Area Manager conversion funnel.
 *
 * customerId is nullable: an anonymous stock-check scan starts without a
 * customer context. actionTaken is filled later (often via a follow-up
 * PATCH) when the BA picks one of the bottom-sheet actions.
 */
export const scanEvents = pgTable(
  "scan_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    /**
     * One of: add_to_cart | add_to_wishlist | reserve | sample_logged |
     * shown_to_customer | send_whatsapp | viewed_only.
     * Null until the BA picks something from the bottom sheet.
     */
    actionTaken: varchar("action_taken", { length: 32 }),
    scannedAt: timestamp("scanned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("scan_events_user_scanned_idx").on(table.userId, table.scannedAt),
    index("scan_events_customer_idx").on(table.customerId),
    index("scan_events_variant_idx").on(table.variantId),
    index("scan_events_store_scanned_idx").on(table.storeId, table.scannedAt),
  ],
);
