import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql, type SQL } from "drizzle-orm";
import { divisions } from "../schema/divisions";

/**
 * Minimal drizzle surface this seed needs. Declared structurally so the
 * function accepts any `NodePgDatabase<…>` regardless of which schema
 * generic the caller bound — the bootstrap uses the full app schema, the
 * CLI here uses just `{ divisions }`.
 */
type DrizzleLike = {
  execute(query: SQL): Promise<unknown>;
};

/**
 * Canonical UUIDs for the four L'Oréal divisions. These ids are hard-coded
 * so that Clerk publicMetadata (which references `divisionId`) stays valid
 * across every environment: local docker, Neon dev, Neon prod, future
 * staging. Without fixed ids each `INSERT … DEFAULT gen_random_uuid()`
 * would mint different UUIDs per environment and break d.puebla's JWT
 * the moment we re-seeded.
 *
 * Don't change these once they ship. Adding a new division uses a fresh
 * UUID; renaming an existing one keeps the id intact.
 */
export const DIVISION_SEED = [
  {
    id: "c74d7620-94e0-421f-9bf8-2e4d1221805e",
    code: "luxe",
    displayName: "L'Oréal Luxe",
  },
  {
    id: "360a3e11-5608-4a65-8ba1-05aa1e6b544f",
    code: "consumer",
    displayName: "Consumer Products",
  },
  {
    id: "2da13042-f8cb-46a2-99c1-46b4d298deda",
    code: "active",
    displayName: "Active Cosmetics",
  },
  {
    id: "b1166840-d11b-49be-a10d-5814e7169663",
    code: "professional",
    displayName: "Professional Products",
  },
] as const;

/**
 * Idempotent upsert: rows already present (by `code`) keep their id, only
 * displayName is refreshed. Safe to re-run on every deploy.
 *
 * Accepts a Drizzle db handle so the caller (bootstrap script, migration
 * runner, ad-hoc CLI) shares the same connection pool.
 */
export async function seedDivisions(db: DrizzleLike): Promise<void> {
  for (const d of DIVISION_SEED) {
    await db.execute(sql`
      INSERT INTO divisions (id, code, display_name)
      VALUES (${d.id}::uuid, ${d.code}, ${d.displayName})
      ON CONFLICT (code) DO UPDATE
        SET display_name = EXCLUDED.display_name,
            updated_at = now()
    `);
  }
}

// ─── CLI entry point ────────────────────────────────────────────────────────

async function main() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgresql://loreal:loreal@localhost:5433/loreal_clienteling",
    // Neon production URLs require SSL; the local docker default does not.
    ssl: process.env.DATABASE_URL?.includes("neon.tech")
      ? { rejectUnauthorized: false }
      : undefined,
  });
  const db = drizzle(pool, { schema: { divisions } });

  console.log("🌱 Seeding divisions…");
  await seedDivisions(db);

  const result = await db.execute(
    sql`SELECT code, id FROM divisions ORDER BY code`,
  );
  console.log("✅ Divisions in DB:");
  for (const row of (result as unknown as {
    rows: { code: string; id: string }[];
  }).rows) {
    console.log(`   ${row.code.padEnd(14)} ${row.id}`);
  }
  await pool.end();
}

// Only run when invoked directly (`pnpm seed:divisions`), not when imported
// from another script.
if (require.main === module) {
  main().catch((err) => {
    console.error("Seed divisions failed:", err);
    process.exit(1);
  });
}
