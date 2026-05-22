import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { vector } from "./_types";

/**
 * One embedding row per customer. Encodes the customer's identity for fuzzy /
 * semantic search ("la señora del labial rojo"). Regenerated when notes or
 * profile data change materially.
 */
export const customerEmbeddings = pgTable(
  "customer_embeddings",
  {
    customerId: uuid("customer_id")
      .primaryKey()
      .references(() => customers.id, { onDelete: "cascade" }),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    model: varchar("model", { length: 64 }).notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("customer_embeddings_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);
