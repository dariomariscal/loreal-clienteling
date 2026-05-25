import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { notes } from "./notes";
import { vector } from "./_types";

/**
 * One embedding per customer note. Enables fine-grained semantic search
 * across the body of past notes ("which customers mentioned sensitive skin").
 */
export const noteEmbeddings = pgTable(
  "note_embeddings",
  {
    noteId: uuid("note_id")
      .primaryKey()
      .references(() => notes.id, { onDelete: "cascade" }),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    model: varchar("model", { length: 64 }).notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("note_embeddings_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);
