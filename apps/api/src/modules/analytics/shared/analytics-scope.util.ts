import { sql, type Column, type SQL } from "drizzle-orm";

/**
 * Builds a `storeIdColumn IN (...)` Drizzle filter for non-admin callers.
 * Returns `undefined` when the caller is admin (no filter) so callers can
 * spread it into a conditions array with `if (filter) conditions.push(filter)`.
 *
 * Centralized so every analytics submodule uses the same scope-filter shape
 * — the WHERE that enforces role-based visibility lives in one place.
 */
export function buildStoreScopeFilter(
  isAdmin: boolean,
  storeIds: string[],
  storeIdColumn: Column,
): SQL | undefined {
  if (isAdmin) return undefined;
  return sql`${storeIdColumn} IN (${sql.join(
    storeIds.map((id) => sql`${id}`),
    sql`, `,
  )})`;
}
