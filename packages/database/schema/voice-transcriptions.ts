import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { users } from "./auth";

/**
 * Audit log for voice → text transcriptions. Keeps a record of every audio
 * sample sent to the transcription provider so we can re-process with newer
 * models or audit what reached a third-party (compliance).
 *
 * Audio payloads themselves are uploaded to R2 — only the URL is stored here.
 */
export const voiceTranscriptions = pgTable(
  "voice_transcriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => users.id),
    audioUrl: text("audio_url"),
    transcript: text("transcript").notNull(),
    language: varchar("language", { length: 8 }).notNull(),
    provider: varchar("provider", { length: 32 }).notNull(),
    model: varchar("model", { length: 64 }).notNull(),
    durationSeconds: integer("duration_seconds"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("voice_transcriptions_customer_idx").on(table.customerId),
    index("voice_transcriptions_author_idx").on(table.authorUserId),
  ],
);
