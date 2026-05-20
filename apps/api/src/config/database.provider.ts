import { Provider } from "@nestjs/common";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, PoolConfig } from "pg";
import * as schema from "@loreal/database";

export const DATABASE_TOKEN = "DATABASE";

function buildPoolConfig(): PoolConfig {
  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://loreal:loreal@localhost:5433/loreal_clienteling";

  // Neon (and most managed Postgres in prod) require SSL. node-postgres
  // does not infer SSL from `sslmode=require` in the URL, so we set it here.
  const needsSsl =
    process.env.PGSSL === "true" ||
    /sslmode=require/.test(connectionString) ||
    /neon\.tech/.test(connectionString);

  return {
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  };
}

export const databaseProvider: Provider = {
  provide: DATABASE_TOKEN,
  useFactory: () => {
    const pool = new Pool(buildPoolConfig());
    return drizzle(pool, { schema });
  },
};

export type Database = ReturnType<typeof drizzle<typeof schema>>;
