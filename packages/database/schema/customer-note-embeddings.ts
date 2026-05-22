import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { customerNotes } from "./customer-notes";
import { vector } from "./_types";

/**
 * One embedding per individual customer note. Enables fine-grained search
 * across the body of past notes ("which customers mentioned sensitive skin").
 */
export const customerNoteEmbeddings = pgTable(
  "customer_note_embeddings",
  {
    customerNoteId: uuid("customer_note_id")
      .primaryKey()
      .references(() => customerNotes.id, { onDelete: "cascade" }),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    model: varchar("model", { length: 64 }).notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("customer_note_embeddings_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);
