import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
// Note: storeId, zoneId, brandId reference domain tables (stores, zones, brands)
// but cannot use DB-level FKs because users.id is text (Clerk userId, e.g.
// "user_2abc...") while domain tables use UUIDs. References are enforced at
// the application level.

// ─── Users (Clerk-backed) ───────────────────────────────────────────────────
// users.id is the Clerk user id. Identity, credentials, 2FA and sessions live
// in Clerk; this table is a local mirror kept in sync via Clerk webhooks so
// domain FKs and SQL listings keep working.

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk userId
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  avatarUrl: text("avatar_url"),

  // ─── Business fields ────────────────────────────────────────────────────
  // Source of truth: Clerk publicMetadata. Mirrored here for joins/listings.
  role: text("role").default("ba").notNull(), // ba | manager | supervisor | admin
  storeId: text("store_id"), // logical FK to stores.id (uuid) — enforced at app level
  zoneId: text("zone_id"), // logical FK to zones.id (uuid) — enforced at app level
  brandId: text("brand_id"), // logical FK to brands.id (uuid) — enforced at app level
  isActive: boolean("is_active").default(true).notNull(),

  // Lifecycle
  invitationStatus: text("invitation_status"), // pending | accepted | revoked
  invitedAt: timestamp("invited_at", { withTimezone: true }),
  invitedByUserId: text("invited_by_user_id"),
  lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const usersRelations = relations(users, () => ({}));
