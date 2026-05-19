import { pgTable, uuid, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { brands } from "./brands";
import { stores } from "./stores";

export const brandStores = pgTable(
  "brand_stores",
  {
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.brandId, table.storeId] }),
    index("brand_stores_store_idx").on(table.storeId),
  ],
);
