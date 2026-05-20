import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "node:path";

// Load env from apps/api/.env when running locally. In containerized runtime
// (Fly release_command, Docker) env vars are already injected, and dotenv is
// not installed — so we skip the load and fall back to process.env.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { config } = require("dotenv") as typeof import("dotenv");
  config({ path: path.resolve(__dirname, "../../apps/api/.env") });
} catch {
  // dotenv not installed — relying on process.env (production / CI).
}

function toDirectNeonUrl(raw: string): string {
  // Neon publishes a pooled URL by default (host contains "-pooler"). Pooled
  // connections can't run multi-statement migrations reliably and the
  // drizzle-kit CLI is known to hang against them on Node 20 + macOS. We also
  // strip channel_binding because node-postgres negotiates SCRAM-SHA-256
  // without it and the extra param caused silent hangs in our setup.
  let url = raw.replace("-pooler", "");
  const parsed = new URL(url);
  parsed.searchParams.delete("channel_binding");
  if (!parsed.searchParams.get("sslmode")) {
    parsed.searchParams.set("sslmode", "require");
  }
  return parsed.toString();
}

async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }
  const url = raw.includes("neon.tech") ? toDirectNeonUrl(raw) : raw;
  const host = new URL(url).host;
  console.log(`→ Migrating against ${host}`);

  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool);

  try {
    await migrate(db, { migrationsFolder: path.resolve(__dirname, "migrations") });
    console.log("✓ Migrations applied");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("✗ Migration failed:", err);
  process.exit(1);
});
