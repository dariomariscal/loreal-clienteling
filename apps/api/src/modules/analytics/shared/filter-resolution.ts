import { eq, and, inArray } from "drizzle-orm";
import { stores, users } from "@loreal/database";
import type { Database } from "../../../config/database.provider";
import type { ReportFiltersInput } from "./report-filters";

/**
 * Resolves entity filters into concrete id sets that the SQL queries can
 * intersect with. Encapsulates the "filters narrow the user's scope" rule so
 * every service applies it consistently:
 *
 *   - banner / storeId / zoneId → narrow accessibleStoreIds.
 *   - baUserId → also narrows the BA-user id set when the service cares about
 *     per-BA aggregation.
 *   - brandId → returned as-is for services that need to filter products /
 *     orders by brand.
 *
 * Returns `null` for `storeIds` when the caller is admin and no filter narrows
 * the set — services should treat that as "no restriction".
 */
export async function resolveScopedFilters(
  db: Database,
  isAdmin: boolean,
  accessibleStoreIds: string[],
  filters: ReportFiltersInput,
): Promise<{
  /** Final store-id set after applying banner / storeId / zoneId. `null` means no restriction (admin, no filters). */
  storeIds: string[] | null;
  /** BA-user id filter — empty when the caller didn't pass `baUserId`. */
  baUserId: string | undefined;
  /** Brand id filter — empty when the caller didn't pass `brandId`. */
  brandId: string | undefined;
}> {
  const { banner, storeId, zoneId, baUserId, brandId } = filters;
  const hasStoreNarrowing = Boolean(banner || storeId || zoneId);

  // Fast path: admin with no narrowing → no store restriction.
  if (isAdmin && !hasStoreNarrowing) {
    return { storeIds: null, baUserId, brandId };
  }

  // Build the candidate store-id set:
  // 1. start from the user's accessible scope (or all stores for admin),
  // 2. AND filter by banner / zoneId,
  // 3. AND restrict to `storeId` if the caller picked a specific store.
  const conds: any[] = [];
  if (!isAdmin) conds.push(inArray(stores.id, accessibleStoreIds));
  if (banner) conds.push(eq(stores.banner, banner));
  if (zoneId) conds.push(eq(stores.zoneId, zoneId));
  if (storeId) conds.push(eq(stores.id, storeId));

  let storeIds: string[];
  if (conds.length === 0) {
    storeIds = accessibleStoreIds;
  } else {
    const rows = await db
      .select({ id: stores.id })
      .from(stores)
      .where(and(...conds));
    storeIds = rows.map((r) => r.id);
  }

  return { storeIds, baUserId, brandId };
}

/**
 * Narrows a per-user filter (e.g. BA-user-id list) by the user's accessible
 * store scope. Used by services that pivot over users.
 */
export async function resolveBaUserIds(
  db: Database,
  storeIds: string[] | null,
  baUserId: string | undefined,
  role: "beauty_advisor" | "counter_manager",
): Promise<string[] | null> {
  if (baUserId) return [baUserId];
  if (storeIds == null) return null;
  if (storeIds.length === 0) return [];
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.role, role),
        eq(users.isActive, true),
        inArray(users.storeId, storeIds),
      ),
    );
  return rows.map((r) => r.id);
}
