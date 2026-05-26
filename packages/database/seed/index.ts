import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import * as schema from "../schema";
import { seedDivisions } from "./divisions";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://loreal:loreal@localhost:5433/loreal_clienteling",
  ssl: process.env.DATABASE_URL?.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : undefined,
});
const db = drizzle(pool, { schema });

// ─── Seed Data ──────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Bootstrap seed (domain reset)...\n");

  // Truncate domain tables. `users` and `divisions` are preserved:
  //   - users: identity is managed by Clerk; the local mirror is repopulated
  //     by the user.created webhook.
  //   - divisions: every environment must keep the same canonical UUIDs
  //     because Clerk publicMetadata.divisionId references them.
  console.log("Truncating tables...");
  await db.execute(sql`TRUNCATE TABLE
    audit_logs, communications, message_templates, consents,
    appointments, appointment_event_types, samples, purchase_items, purchases,
    recommendations, product_availability, beauty_profile_shades,
    beauty_profiles, customers, products, brand_configs,
    brand_stores, stores, zone_municipalities, zones, brands
    CASCADE`);

  // Re-seed divisions with their canonical UUIDs. Idempotent: existing rows
  // keep their id, only displayName is refreshed.
  console.log("Seeding divisions...");
  await seedDivisions(db);

  console.log("\n✅ Bootstrap complete.\n");
  console.log(`Next steps:
  1. Create an admin user in the Clerk dashboard (https://dashboard.clerk.com).
  2. Set their publicMetadata to: { "role": "admin", "fullName": "Administrador Central" }.
  3. The user.created webhook will insert the local mirror row automatically.
  4. Sign in with that admin to seed brands, zones, stores, etc. through the app.

Municipalities reference data is preserved — run \`pnpm seed:municipalities\`
once after a full reset to repopulate it.
`);

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  pool.end();
  process.exit(1);
});
