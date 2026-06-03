import { Injectable, Inject } from "@nestjs/common";
import { and, eq, gte, lte, inArray, sql, isNotNull } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import {
  appointments,
  brands,
  customers,
  orders,
  lineItems,
  products,
  recommendations,
  retailGroups,
  stores,
  suggestedActions,
  users,
  zones,
} from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../../common/types/session";
import { ScopeService } from "../../../common/services/scope.service";
import { getDefaultDateRange } from "../shared/analytics-date.util";
import type { ReportFiltersInput } from "../shared/report-filters";

export interface FilterOption {
  id: string;
  label: string;
}

export interface FilterOptionsResponse {
  stores: FilterOption[];
  brands: FilterOption[];
  banners: FilterOption[];
  baUsers: FilterOption[];
  zones: FilterOption[];
}

/**
 * Returns the entity options that have at least one activity record in the
 * current period and scope. "Activity" is the union of orders, appointments,
 * recommendations, customer registrations and follow-ups touching the entity.
 *
 * The endpoint is faceted: each slot is computed by applying every OTHER
 * filter the caller already chose, but ignoring the slot's own value. That
 * way picking "Lancôme" narrows the store/BA dropdowns without locking the
 * brand dropdown to a single item.
 */
@Injectable()
export class FilterOptionsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  async getOptions(
    user: SessionUser,
    filters: ReportFiltersInput,
  ): Promise<FilterOptionsResponse> {
    const isAdmin = user.role === UserRole.ADMIN;
    const accessibleStoreIds = await this.scopeService.getAccessibleStoreIds(user);
    const { from, to } = getDefaultDateRange(filters);

    // Build store-id sets per slot. For slot X we apply every filter EXCEPT
    // the one that lives in slot X — that's what makes the dropdown facet.
    const [
      storeIdsForStoreSlot,
      storeIdsForBrandSlot,
      storeIdsForBannerSlot,
      storeIdsForBaSlot,
      storeIdsForZoneSlot,
    ] = await Promise.all([
      this.resolveStoreScope(isAdmin, accessibleStoreIds, { ...filters, storeId: undefined }),
      this.resolveStoreScope(isAdmin, accessibleStoreIds, { ...filters, brandId: undefined }),
      this.resolveStoreScope(isAdmin, accessibleStoreIds, { ...filters, banner: undefined }),
      this.resolveStoreScope(isAdmin, accessibleStoreIds, { ...filters, baUserId: undefined }),
      this.resolveStoreScope(isAdmin, accessibleStoreIds, { ...filters, zoneId: undefined }),
    ]);

    // For BA/brand slots we also drop their own value from the activity
    // queries, otherwise the join would self-restrict the result.
    const brandIdForOthers = filters.brandId;
    const baUserIdForOthers = filters.baUserId;

    const [
      activeStores,
      activeBrands,
      activeBanners,
      activeBaUsers,
      activeZones,
    ] = await Promise.all([
      this.activeStores(storeIdsForStoreSlot, from, to, brandIdForOthers, baUserIdForOthers),
      this.activeBrands(storeIdsForBrandSlot, from, to, baUserIdForOthers),
      this.activeBanners(storeIdsForBannerSlot, from, to, brandIdForOthers, baUserIdForOthers),
      this.activeBaUsers(storeIdsForBaSlot, from, to, brandIdForOthers),
      this.activeZones(storeIdsForZoneSlot, from, to, brandIdForOthers, baUserIdForOthers),
    ]);

    return {
      stores: activeStores,
      brands: activeBrands,
      banners: activeBanners,
      baUsers: activeBaUsers,
      zones: activeZones,
    };
  }

  /**
   * Mirrors the store-narrowing logic in `resolveScopedFilters` but inlined
   * here so the caller can run it five times in parallel with different
   * filter shapes.
   */
  private async resolveStoreScope(
    isAdmin: boolean,
    accessibleStoreIds: string[],
    filters: ReportFiltersInput,
  ): Promise<string[] | null> {
    const { banner, storeId, zoneId } = filters;
    const hasNarrowing = Boolean(banner || storeId || zoneId);
    if (isAdmin && !hasNarrowing) return null;

    const conds: any[] = [];
    if (!isAdmin) conds.push(inArray(stores.id, accessibleStoreIds));
    if (banner) conds.push(eq(stores.banner, banner));
    if (zoneId) conds.push(eq(stores.zoneId, zoneId));
    if (storeId) conds.push(eq(stores.id, storeId));

    if (conds.length === 0) return accessibleStoreIds;

    const rows = await this.db
      .select({ id: stores.id })
      .from(stores)
      .where(and(...conds));
    return rows.map((r) => r.id);
  }

  private storeFilter(col: any, storeIds: string[] | null) {
    return storeIds == null ? undefined : inArray(col, storeIds);
  }

  /**
   * Stores that show activity from any of the canonical activity tables.
   * Union of: orders.storeId, appointments.storeId, recommendations.storeId,
   * customers.signupStoreId (when the customer was enrolled in-period).
   */
  private async activeStores(
    storeIds: string[] | null,
    from: Date,
    to: Date,
    brandId: string | undefined,
    baUserId: string | undefined,
  ): Promise<FilterOption[]> {
    if (storeIds != null && storeIds.length === 0) return [];

    const fromOrders = brandId
      ? this.db
          .selectDistinct({ id: orders.storeId })
          .from(orders)
          .innerJoin(lineItems, eq(lineItems.orderId, orders.id))
          .innerJoin(products, eq(products.id, lineItems.productId))
          .where(
            and(
              gte(orders.processedAt, from),
              lte(orders.processedAt, to),
              eq(products.brandId, brandId),
              ...(baUserId ? [eq(orders.attributedUserId, baUserId)] : []),
              this.storeFilter(orders.storeId, storeIds),
            ),
          )
      : this.db
          .selectDistinct({ id: orders.storeId })
          .from(orders)
          .where(
            and(
              gte(orders.processedAt, from),
              lte(orders.processedAt, to),
              ...(baUserId ? [eq(orders.attributedUserId, baUserId)] : []),
              this.storeFilter(orders.storeId, storeIds),
            ),
          );

    const fromAppointments = this.db
      .selectDistinct({ id: appointments.storeId })
      .from(appointments)
      .where(
        and(
          gte(appointments.startTime, from),
          lte(appointments.startTime, to),
          ...(baUserId ? [eq(appointments.staffUserId, baUserId)] : []),
          this.storeFilter(appointments.storeId, storeIds),
        ),
      );

    const fromCustomers = this.db
      .selectDistinct({ id: customers.signupStoreId })
      .from(customers)
      .where(
        and(
          gte(customers.enrolledAt, from),
          lte(customers.enrolledAt, to),
          this.storeFilter(customers.signupStoreId, storeIds),
        ),
      );

    const [oRows, aRows, cRows] = await Promise.all([
      fromOrders,
      fromAppointments,
      fromCustomers,
    ]);

    const activeIds = new Set<string>([
      ...oRows.map((r) => r.id).filter(Boolean),
      ...aRows.map((r) => r.id).filter(Boolean),
      ...cRows.map((r) => r.id).filter(Boolean),
    ] as string[]);

    if (activeIds.size === 0) return [];

    const storeRows = await this.db
      .select({ id: stores.id, displayName: stores.displayName })
      .from(stores)
      .where(inArray(stores.id, Array.from(activeIds)));

    return storeRows
      .map((s) => ({ id: s.id, label: s.displayName }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }

  /**
   * Brands with at least one line-item sale or recommendation in scope.
   */
  private async activeBrands(
    storeIds: string[] | null,
    from: Date,
    to: Date,
    baUserId: string | undefined,
  ): Promise<FilterOption[]> {
    if (storeIds != null && storeIds.length === 0) return [];

    const fromSales = this.db
      .selectDistinct({ id: products.brandId })
      .from(lineItems)
      .innerJoin(orders, eq(orders.id, lineItems.orderId))
      .innerJoin(products, eq(products.id, lineItems.productId))
      .where(
        and(
          gte(orders.processedAt, from),
          lte(orders.processedAt, to),
          ...(baUserId ? [eq(orders.attributedUserId, baUserId)] : []),
          this.storeFilter(orders.storeId, storeIds),
        ),
      );

    const fromRecs = this.db
      .selectDistinct({ id: products.brandId })
      .from(recommendations)
      .innerJoin(products, eq(products.id, recommendations.productId))
      .where(
        and(
          gte(recommendations.recommendedAt, from),
          lte(recommendations.recommendedAt, to),
          ...(baUserId ? [eq(recommendations.recommendedByUserId, baUserId)] : []),
          this.storeFilter(recommendations.storeId, storeIds),
        ),
      );

    const [sRows, rRows] = await Promise.all([fromSales, fromRecs]);
    const ids = new Set<string>([
      ...sRows.map((r) => r.id).filter(Boolean),
      ...rRows.map((r) => r.id).filter(Boolean),
    ] as string[]);
    if (ids.size === 0) return [];

    const brandRows = await this.db
      .select({ id: brands.id, displayName: brands.displayName })
      .from(brands)
      .where(inArray(brands.id, Array.from(ids)));

    return brandRows
      .map((b) => ({ id: b.id, label: b.displayName }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }

  /**
   * Banners (denormalized retail group code) with stores that show activity
   * in scope. We collect the active store IDs first then look up their
   * banner codes — keeps the SQL simple and reuses the same activity union.
   */
  private async activeBanners(
    storeIds: string[] | null,
    from: Date,
    to: Date,
    brandId: string | undefined,
    baUserId: string | undefined,
  ): Promise<FilterOption[]> {
    const activeStores = await this.activeStores(storeIds, from, to, brandId, baUserId);
    if (activeStores.length === 0) return [];

    const rows = await this.db
      .selectDistinct({ banner: stores.banner })
      .from(stores)
      .where(inArray(stores.id, activeStores.map((s) => s.id)));

    const codes = rows.map((r) => r.banner).filter(Boolean) as string[];
    if (codes.length === 0) return [];

    const groupRows = await this.db
      .select({ code: retailGroups.code, name: retailGroups.name })
      .from(retailGroups)
      .where(
        and(
          eq(retailGroups.kind, "banner"),
          inArray(retailGroups.code, codes),
        ),
      );
    const nameByCode = new Map(groupRows.map((g) => [g.code, g.name] as const));

    return codes
      .map((code) => ({ id: code, label: nameByCode.get(code) ?? code }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }

  /**
   * BAs with activity attributed to them (orders / appointments / recs /
   * follow-ups) in scope.
   */
  private async activeBaUsers(
    storeIds: string[] | null,
    from: Date,
    to: Date,
    brandId: string | undefined,
  ): Promise<FilterOption[]> {
    if (storeIds != null && storeIds.length === 0) return [];

    const fromOrders = brandId
      ? this.db
          .selectDistinct({ id: orders.attributedUserId })
          .from(orders)
          .innerJoin(lineItems, eq(lineItems.orderId, orders.id))
          .innerJoin(products, eq(products.id, lineItems.productId))
          .where(
            and(
              gte(orders.processedAt, from),
              lte(orders.processedAt, to),
              eq(products.brandId, brandId),
              isNotNull(orders.attributedUserId),
              this.storeFilter(orders.storeId, storeIds),
            ),
          )
      : this.db
          .selectDistinct({ id: orders.attributedUserId })
          .from(orders)
          .where(
            and(
              gte(orders.processedAt, from),
              lte(orders.processedAt, to),
              isNotNull(orders.attributedUserId),
              this.storeFilter(orders.storeId, storeIds),
            ),
          );

    const fromAppointments = this.db
      .selectDistinct({ id: appointments.staffUserId })
      .from(appointments)
      .where(
        and(
          gte(appointments.startTime, from),
          lte(appointments.startTime, to),
          isNotNull(appointments.staffUserId),
          this.storeFilter(appointments.storeId, storeIds),
        ),
      );

    const fromRecs = brandId
      ? this.db
          .selectDistinct({ id: recommendations.recommendedByUserId })
          .from(recommendations)
          .innerJoin(products, eq(products.id, recommendations.productId))
          .where(
            and(
              gte(recommendations.recommendedAt, from),
              lte(recommendations.recommendedAt, to),
              eq(products.brandId, brandId),
              isNotNull(recommendations.recommendedByUserId),
              this.storeFilter(recommendations.storeId, storeIds),
            ),
          )
      : this.db
          .selectDistinct({ id: recommendations.recommendedByUserId })
          .from(recommendations)
          .where(
            and(
              gte(recommendations.recommendedAt, from),
              lte(recommendations.recommendedAt, to),
              isNotNull(recommendations.recommendedByUserId),
              this.storeFilter(recommendations.storeId, storeIds),
            ),
          );

    const fromFollowUps = this.db
      .selectDistinct({ id: suggestedActions.assignedToUserId })
      .from(suggestedActions)
      .where(
        and(
          gte(suggestedActions.createdAt, from),
          lte(suggestedActions.createdAt, to),
          isNotNull(suggestedActions.assignedToUserId),
        ),
      );

    const [oRows, aRows, rRows, fRows] = await Promise.all([
      fromOrders,
      fromAppointments,
      fromRecs,
      fromFollowUps,
    ]);

    const activeIds = new Set<string>([
      ...oRows.map((r) => r.id).filter(Boolean),
      ...aRows.map((r) => r.id).filter(Boolean),
      ...rRows.map((r) => r.id).filter(Boolean),
      ...fRows.map((r) => r.id).filter(Boolean),
    ] as string[]);

    if (activeIds.size === 0) return [];

    // Filter to BAs only (orders/appointments can be attributed to non-BA
    // roles). Also drop inactive users so the dropdown stays clean.
    const userRows = await this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        storeId: users.storeId,
      })
      .from(users)
      .where(
        and(
          eq(users.role, "beauty_advisor"),
          eq(users.isActive, true),
          inArray(users.id, Array.from(activeIds)),
          ...(storeIds != null ? [inArray(users.storeId, storeIds)] : []),
        ),
      );

    return userRows
      .map((u) => ({ id: u.id, label: u.fullName ?? u.email ?? u.id }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }

  /**
   * Zones whose stores show activity in scope.
   */
  private async activeZones(
    storeIds: string[] | null,
    from: Date,
    to: Date,
    brandId: string | undefined,
    baUserId: string | undefined,
  ): Promise<FilterOption[]> {
    const activeStores = await this.activeStores(storeIds, from, to, brandId, baUserId);
    if (activeStores.length === 0) return [];

    const rows = await this.db
      .selectDistinct({ zoneId: stores.zoneId })
      .from(stores)
      .where(
        and(
          inArray(stores.id, activeStores.map((s) => s.id)),
          isNotNull(stores.zoneId),
        ),
      );

    const ids = rows.map((r) => r.zoneId).filter(Boolean) as string[];
    if (ids.length === 0) return [];

    const zoneRows = await this.db
      .select({ id: zones.id, displayName: zones.displayName })
      .from(zones)
      .where(inArray(zones.id, ids));

    return zoneRows
      .map((z) => ({ id: z.id, label: z.displayName }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }
}
