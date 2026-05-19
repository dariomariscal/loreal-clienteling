import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import * as schema from "../schema";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://loreal:loreal@localhost:5433/loreal_clienteling",
});
const db = drizzle(pool, { schema });

// ─── Helpers ────────────────────────────────────────────────────────────────

function uuid() {
  return crypto.randomUUID();
}

// Better Auth uses @noble/hashes scrypt with N=16384, r=16, p=1, dkLen=64.
// node:crypto.scrypt defaults to r=8, so we must pass r=16 explicitly.
async function hashPassword(password: string): Promise<string> {
  const crypto = await import("node:crypto");
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 }, (err, key) => {
      if (err) reject(err);
      else resolve(`${salt}:${key.toString("hex")}`);
    });
  });
}

// ─── Seed Data ──────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Bootstrap seed (admin only)...\n");

  // Truncate auth + domain tables. Municipalities are preserved (static reference data).
  console.log("Truncating tables...");
  await db.execute(sql`TRUNCATE TABLE
    audit_logs, communications, message_templates, consents,
    appointments, appointment_event_types, samples, purchase_items, purchases,
    recommendations, product_availability, beauty_profile_shades,
    beauty_profiles, customers, products, brand_configs,
    brand_stores, stores, zone_municipalities, zones, brands,
    two_factors, sessions, accounts, verifications, users
    CASCADE`);

  // ─── Admin user ────────────────────────────────────────────────────────────
  console.log("Seeding admin user...");
  const passwordHash = await hashPassword("Password123!");
  const adminId = uuid();

  await db.insert(schema.users).values({
    id: adminId,
    name: "Admin Central",
    email: "admin@loreal.mx",
    emailVerified: true,
    fullName: "Administrador Central",
    role: "admin",
    storeId: null,
    zoneId: null,
    brandId: null,
    active: true,
  });

  await db.insert(schema.accounts).values({
    id: uuid(),
    accountId: adminId,
    providerId: "credential",
    userId: adminId,
    password: passwordHash,
  });

  console.log("\n✅ Bootstrap complete.");
  console.log(`
Login:
  Email:    admin@loreal.mx
  Password: Password123!

All other data (brands, zones, stores, users, products, customers...)
should be created manually through the app, simulating a real first-use flow.

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
