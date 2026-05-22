import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

/**
 * Cross-cutting telemetry for every AI provider call. Powers cost dashboards,
 * per-user budgets and provider-quality comparisons. Keeps no prompt or
 * response bodies — only metadata — so retention can be long without exposing
 * personal data.
 */
export const aiUsageLogs = pgTable(
  "ai_usage_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    feature: varchar("feature", { length: 64 }).notNull(),
    provider: varchar("provider", { length: 32 }).notNull(),
    model: varchar("model", { length: 64 }).notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cachedTokens: integer("cached_tokens").notNull().default(0),
    latencyMs: integer("latency_ms").notNull(),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }).notNull().default("0"),
    status: varchar("status", { length: 16 }).notNull().default("success"),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ai_usage_logs_user_created_idx").on(table.userId, table.createdAt),
    index("ai_usage_logs_feature_created_idx").on(table.feature, table.createdAt),
  ],
);
