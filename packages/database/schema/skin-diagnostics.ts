import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  numeric,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { users } from "./auth";

/**
 * AI-powered skin diagnostic (selfie analysis) records. Mirrors the
 * Revieve / Haut.AI / L'Oréal Beauty Genius pattern: photo in, structured
 * biomarkers out, product recommendations generated against the catalog.
 *
 * One row per scan so we can show progress over time.
 */
export const skinDiagnostics = pgTable(
  "skin_diagnostics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id"),
    capturedByUserId: text("captured_by_user_id").references(() => users.id),

    photoUrl: text("photo_url").notNull(),

    /** Normalized scores per biomarker, 0–1 scale. */
    biomarkers: jsonb("biomarkers").$type<{
      wrinkles?: number;
      darkSpots?: number;
      hydration?: number;
      pores?: number;
      redness?: number;
      acne?: number;
      darkCircles?: number;
      texture?: number;
      firmness?: number;
    }>(),

    overallSkinAge: integer("overall_skin_age"),
    overallScore: numeric("overall_score", { precision: 4, scale: 2 }),

    /** Snapshot of products the diagnostic recommended at the time. */
    recommendedProductIds: jsonb("recommended_product_ids").$type<string[]>(),

    provider: varchar("provider", { length: 32 }).notNull(),
    model: varchar("model", { length: 64 }).notNull(),

    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("skin_diagnostics_customer_idx").on(table.customerId),
    index("skin_diagnostics_captured_idx").on(table.capturedAt),
  ],
);
