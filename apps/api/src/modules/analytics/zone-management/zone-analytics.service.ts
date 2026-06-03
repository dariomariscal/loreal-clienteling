import { Injectable, Inject, ForbiddenException } from "@nestjs/common";
import { eq, and, gte, lte, sql, count, inArray } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import {
  customers,
  orders,
  lineItems,
  recommendations,
  appointments,
  samples,
  products,
  users,
  stores,
  brands,
  brandStores,
  retailGroups,
  zones,
} from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../../common/types/session";
import { ScopeService } from "../../../common/services/scope.service";
import { getDefaultDateRange, type DateRange } from "../shared/analytics-date.util";
import { buildStoreScopeFilter } from "../shared/analytics-scope.util";
import type { ReportFiltersInput } from "../shared/report-filters";
import { resolveScopedFilters } from "../shared/filter-resolution";

@Injectable()
export class ZoneAnalyticsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  /**
   * Aggregated multi-store dashboard for the Area / National Retail Manager.
   * Fans out the same KPIs as the counter dashboard but across every store
   * the user can see (scope resolved by ScopeService).
   *
   * `filters` lets the caller narrow by banner, brand, store, BA or zone.
   * Each narrows the underlying SQL WHERE on top of the role-based scope.
   */
  async getOverview(user: SessionUser, filters?: ReportFiltersInput) {
    if (
      user.role !== UserRole.AREA_MANAGER &&
      user.role !== UserRole.NATIONAL_RETAIL_MANAGER &&
      user.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        "Zone overview is restricted to area_manager, national_retail_manager and admin",
      );
    }

    const accessible = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === UserRole.ADMIN;
    const { from, to } = getDefaultDateRange(filters);

    const resolved = await resolveScopedFilters(this.db, isAdmin, accessible, filters ?? {});
    const { storeIds, baUserId, brandId } = resolved;

    const emptyScope = storeIds != null && storeIds.length === 0;
    if (emptyScope) {
      return {
        period: { from, to },
        scope: { storeCount: 0, storeIds: [] },
        sales: { totalAmount: 0, orderCount: 0, uniqueCustomers: 0 },
        customers: { total: 0, newInPeriod: 0 },
        appointments: { total: 0, completed: 0, noShow: 0 },
        recommendations: { total: 0, converted: 0, conversionPct: null },
        samples: { delivered: 0, converted: 0 },
      };
    }

    const storeIn = (col: any) =>
      storeIds == null ? undefined : inArray(col, storeIds);

    // Sales: aggregated from line_items when brandId is set (we need product.brandId);
    // otherwise from orders directly for performance.
    const orderConds: any[] = [
      gte(orders.processedAt, from),
      lte(orders.processedAt, to),
    ];
    const sIn = storeIn(orders.storeId);
    if (sIn) orderConds.push(sIn);
    if (baUserId) orderConds.push(eq(orders.attributedUserId, baUserId));

    let salesAgg: { totalAmount: string | number; orderCount: number; uniqueCustomers: number } | undefined;
    if (brandId) {
      const [row] = await this.db
        .select({
          totalAmount: sql<string>`coalesce(sum(${lineItems.price} * ${lineItems.quantity}), 0)`,
          orderCount: sql<number>`count(distinct ${orders.id})::int`,
          uniqueCustomers: sql<number>`count(distinct ${orders.customerId})::int`,
        })
        .from(lineItems)
        .innerJoin(orders, eq(orders.id, lineItems.orderId))
        .innerJoin(products, eq(products.id, lineItems.productId))
        .where(and(...orderConds, eq(products.brandId, brandId)));
      salesAgg = row;
    } else {
      const [row] = await this.db
        .select({
          totalAmount: sql<string>`coalesce(sum(${orders.totalPrice}), 0)`,
          orderCount: count(),
          uniqueCustomers: sql<number>`count(distinct ${orders.customerId})::int`,
        })
        .from(orders)
        .where(and(...orderConds));
      salesAgg = row;
    }

    const totalCustConds: any[] = [];
    const cIn = storeIn(customers.signupStoreId);
    if (cIn) totalCustConds.push(cIn);
    const [totalCust] = await this.db
      .select({ count: count() })
      .from(customers)
      .where(totalCustConds.length ? and(...totalCustConds) : undefined);

    const newCustConds: any[] = [
      gte(customers.enrolledAt, from),
      lte(customers.enrolledAt, to),
    ];
    if (cIn) newCustConds.push(cIn);
    const [newCust] = await this.db
      .select({ count: count() })
      .from(customers)
      .where(and(...newCustConds));

    const apptConds: any[] = [
      gte(appointments.startTime, from),
      lte(appointments.startTime, to),
    ];
    const aIn = storeIn(appointments.storeId);
    if (aIn) apptConds.push(aIn);
    if (baUserId) apptConds.push(eq(appointments.staffUserId, baUserId));
    const [apptAgg] = await this.db
      .select({
        total: count(),
        completed: sql<number>`count(*) filter (where ${appointments.status} = 'completed')::int`,
        noShow: sql<number>`count(*) filter (where ${appointments.status} = 'no_show')::int`,
      })
      .from(appointments)
      .where(and(...apptConds));

    const recConds: any[] = [
      gte(recommendations.recommendedAt, from),
      lte(recommendations.recommendedAt, to),
    ];
    const rIn = storeIn(recommendations.storeId);
    if (rIn) recConds.push(rIn);
    if (baUserId) recConds.push(eq(recommendations.recommendedByUserId, baUserId));

    let recAgg: { total: number; converted: number } | undefined;
    if (brandId) {
      const [row] = await this.db
        .select({
          total: count(),
          converted: sql<number>`count(*) filter (where ${recommendations.isConverted} = true)::int`,
        })
        .from(recommendations)
        .innerJoin(products, eq(products.id, recommendations.productId))
        .where(and(...recConds, eq(products.brandId, brandId)));
      recAgg = row;
    } else {
      const [row] = await this.db
        .select({
          total: count(),
          converted: sql<number>`count(*) filter (where ${recommendations.isConverted} = true)::int`,
        })
        .from(recommendations)
        .where(and(...recConds));
      recAgg = row;
    }

    const sampleConds: any[] = [
      gte(samples.deliveredAt, from),
      lte(samples.deliveredAt, to),
    ];
    const smIn = storeIn(samples.storeId);
    if (smIn) sampleConds.push(smIn);
    const [sampleAgg] = await this.db
      .select({
        delivered: count(),
        converted: sql<number>`count(*) filter (where ${samples.isConverted} = true)::int`,
      })
      .from(samples)
      .where(and(...sampleConds));

    const recTotal = recAgg?.total ?? 0;
    const conversionPct =
      recTotal > 0 ? Math.round(((recAgg?.converted ?? 0) / recTotal) * 100) : null;

    return {
      period: { from, to },
      scope: {
        storeCount: storeIds == null ? null : storeIds.length,
        storeIds: storeIds,
      },
      sales: {
        totalAmount: Number(salesAgg?.totalAmount ?? 0),
        orderCount: salesAgg?.orderCount ?? 0,
        uniqueCustomers: salesAgg?.uniqueCustomers ?? 0,
      },
      customers: {
        total: totalCust?.count ?? 0,
        newInPeriod: newCust?.count ?? 0,
      },
      appointments: {
        total: apptAgg?.total ?? 0,
        completed: apptAgg?.completed ?? 0,
        noShow: apptAgg?.noShow ?? 0,
      },
      recommendations: {
        total: recTotal,
        converted: recAgg?.converted ?? 0,
        conversionPct,
      },
      samples: {
        delivered: sampleAgg?.delivered ?? 0,
        converted: sampleAgg?.converted ?? 0,
      },
    };
  }

  /**
   * Per-store ranking for the user's accessible stores. Lets an Area / National
   * Retail Manager compare every store in their scope side-by-side.
   *
   * Optional filters allow narrowing by `banner` (the denormalized store column)
   * or `retailGroupId` (the leaf in the retail_groups hierarchy).
   */
  async getStoresRanking(
    user: SessionUser,
    range?: DateRange,
    filters?: { banner?: string; retailGroupId?: string },
  ) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === UserRole.ADMIN;
    const { from, to } = getDefaultDateRange(range);

    if (!isAdmin && storeIds.length === 0) {
      return { period: { from, to }, data: [] };
    }

    // Pre-filter stores by banner / retailGroupId if provided. Used both
    // to scope the store list query and to filter aggregates.
    let filteredStoreIds = storeIds;
    if (filters?.banner || filters?.retailGroupId) {
      const conds: any[] = [];
      if (filters.banner) conds.push(eq(stores.banner, filters.banner));
      if (filters.retailGroupId) conds.push(eq(stores.retailGroupId, filters.retailGroupId));
      if (!isAdmin) conds.push(inArray(stores.id, storeIds));
      const matchingStores = await this.db
        .select({ id: stores.id })
        .from(stores)
        .where(and(...conds));
      filteredStoreIds = matchingStores.map((s) => s.id);
      if (filteredStoreIds.length === 0) {
        return { period: { from, to }, data: [] };
      }
    }

    const storeFilter =
      filters?.banner || filters?.retailGroupId
        ? inArray(orders.storeId, filteredStoreIds)
        : buildStoreScopeFilter(isAdmin, storeIds, orders.storeId);
    const orderConds: any[] = [
      gte(orders.processedAt, from),
      lte(orders.processedAt, to),
    ];
    if (storeFilter) orderConds.push(storeFilter);

    const salesByStore = await this.db
      .select({
        storeId: orders.storeId,
        totalAmount: sql<string>`coalesce(sum(${orders.totalPrice}), 0)`,
        orderCount: count(),
        uniqueCustomers: sql<number>`count(distinct ${orders.customerId})::int`,
      })
      .from(orders)
      .where(and(...orderConds))
      .groupBy(orders.storeId);

    const custFilter =
      filters?.banner || filters?.retailGroupId
        ? inArray(customers.signupStoreId, filteredStoreIds)
        : buildStoreScopeFilter(isAdmin, storeIds, customers.signupStoreId);
    const newCustConds: any[] = [
      gte(customers.enrolledAt, from),
      lte(customers.enrolledAt, to),
    ];
    if (custFilter) newCustConds.push(custFilter);
    const newByStore = await this.db
      .select({
        storeId: customers.signupStoreId,
        count: count(),
      })
      .from(customers)
      .where(and(...newCustConds))
      .groupBy(customers.signupStoreId);

    const recFilter =
      filters?.banner || filters?.retailGroupId
        ? inArray(recommendations.storeId, filteredStoreIds)
        : buildStoreScopeFilter(isAdmin, storeIds, recommendations.storeId);
    const recConds: any[] = [
      gte(recommendations.recommendedAt, from),
      lte(recommendations.recommendedAt, to),
    ];
    if (recFilter) recConds.push(recFilter);
    const recByStore = await this.db
      .select({
        storeId: recommendations.storeId,
        total: count(),
        converted: sql<number>`count(*) filter (where ${recommendations.isConverted} = true)::int`,
      })
      .from(recommendations)
      .where(and(...recConds))
      .groupBy(recommendations.storeId);

    // Use the resolved storeIds for non-admin; for admin pull every store
    let storeRows: { id: string; displayName: string; zoneId: string | null; banner: string }[];
    if (isAdmin && !filters?.banner && !filters?.retailGroupId) {
      storeRows = await this.db
        .select({ id: stores.id, displayName: stores.displayName, zoneId: stores.zoneId, banner: stores.banner })
        .from(stores);
    } else {
      storeRows = await this.db
        .select({ id: stores.id, displayName: stores.displayName, zoneId: stores.zoneId, banner: stores.banner })
        .from(stores)
        .where(inArray(stores.id, filteredStoreIds));
    }

    const salesMap = new Map(salesByStore.map((r) => [r.storeId, r]));
    const newMap = new Map(newByStore.map((r) => [r.storeId, r.count]));
    const recMap = new Map(recByStore.map((r) => [r.storeId, r]));

    const data = storeRows.map((s) => {
      const sales = salesMap.get(s.id);
      const recs = recMap.get(s.id);
      const totalAmount = Number(sales?.totalAmount ?? 0);
      const orderCount = sales?.orderCount ?? 0;
      const total = recs?.total ?? 0;
      return {
        storeId: s.id,
        storeName: s.displayName,
        zoneId: s.zoneId,
        banner: s.banner,
        sales: {
          totalAmount,
          orderCount,
          uniqueCustomers: sales?.uniqueCustomers ?? 0,
          avgTicket: orderCount > 0 ? totalAmount / orderCount : 0,
        },
        newCustomers: newMap.get(s.id) ?? 0,
        recommendations: {
          total,
          converted: recs?.converted ?? 0,
          conversionPct:
            total > 0 ? Math.round(((recs?.converted ?? 0) / total) * 100) : null,
        },
      };
    });

    data.sort((a, b) => b.sales.totalAmount - a.sales.totalAmount);

    return { period: { from, to }, data };
  }

  /**
   * Top Franquicias — ranking aggregated by `banner` (the denormalized
   * `stores.banner` column). Mirrors getZonesRanking but groups by retail
   * banner. Visible to area / national / admin.
   */
  async getBannersRanking(user: SessionUser, range?: DateRange) {
    if (
      user.role !== UserRole.AREA_MANAGER &&
      user.role !== UserRole.NATIONAL_RETAIL_MANAGER &&
      user.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        "Banners ranking is restricted to area_manager, national_retail_manager and admin",
      );
    }

    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === UserRole.ADMIN;
    const { from, to } = getDefaultDateRange(range);

    if (!isAdmin && storeIds.length === 0) {
      return { period: { from, to }, data: [] };
    }

    const orderConds: any[] = [
      gte(orders.processedAt, from),
      lte(orders.processedAt, to),
    ];
    if (!isAdmin) orderConds.push(inArray(orders.storeId, storeIds));

    const salesByBanner = await this.db
      .select({
        banner: stores.banner,
        totalAmount: sql<string>`coalesce(sum(${orders.totalPrice}), 0)`,
        orderCount: count(),
        uniqueCustomers: sql<number>`count(distinct ${orders.customerId})::int`,
      })
      .from(orders)
      .innerJoin(stores, eq(stores.id, orders.storeId))
      .where(and(...orderConds))
      .groupBy(stores.banner);

    const newConds: any[] = [
      gte(customers.enrolledAt, from),
      lte(customers.enrolledAt, to),
    ];
    if (!isAdmin) newConds.push(inArray(customers.signupStoreId, storeIds));

    const newByBanner = await this.db
      .select({
        banner: stores.banner,
        count: count(),
      })
      .from(customers)
      .innerJoin(stores, eq(stores.id, customers.signupStoreId))
      .where(and(...newConds))
      .groupBy(stores.banner);

    const storeCountConds: any[] = [];
    if (!isAdmin) storeCountConds.push(inArray(stores.id, storeIds));
    const storeCountByBanner = await this.db
      .select({ banner: stores.banner, count: count() })
      .from(stores)
      .where(storeCountConds.length ? and(...storeCountConds) : undefined)
      .groupBy(stores.banner);

    // Resolve banner pretty names from retail_groups when available
    const groupRows = await this.db
      .select({ code: retailGroups.code, name: retailGroups.name })
      .from(retailGroups)
      .where(eq(retailGroups.kind, "banner"));
    const groupNames = new Map(groupRows.map((g) => [g.code, g.name]));

    const salesMap = new Map(salesByBanner.map((r) => [r.banner, r]));
    const newMap = new Map(newByBanner.map((r) => [r.banner, r.count]));
    const countMap = new Map(storeCountByBanner.map((r) => [r.banner, r.count]));

    const allBanners = new Set<string>([
      ...salesByBanner.map((r) => r.banner),
      ...storeCountByBanner.map((r) => r.banner),
    ]);

    const data = Array.from(allBanners).map((banner) => {
      const sales = salesMap.get(banner);
      const totalAmount = Number(sales?.totalAmount ?? 0);
      const orderCount = sales?.orderCount ?? 0;
      return {
        banner,
        bannerName: groupNames.get(banner) ?? banner,
        storeCount: countMap.get(banner) ?? 0,
        sales: {
          totalAmount,
          orderCount,
          uniqueCustomers: sales?.uniqueCustomers ?? 0,
          avgTicket: orderCount > 0 ? totalAmount / orderCount : 0,
        },
        newCustomers: newMap.get(banner) ?? 0,
      };
    });

    data.sort((a, b) => b.sales.totalAmount - a.sales.totalAmount);

    return { period: { from, to }, data };
  }

  /**
   * Ranking of Counter Managers across the user's accessible stores.
   */
  async getCounterManagersRanking(user: SessionUser, range?: DateRange) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === UserRole.ADMIN;
    const { from, to } = getDefaultDateRange(range);

    const managerConds: any[] = [
      eq(users.role, "counter_manager"),
      eq(users.isActive, true),
    ];
    if (!isAdmin) {
      if (storeIds.length === 0) return { period: { from, to }, data: [] };
      managerConds.push(
        sql`${users.storeId} IN (${sql.join(storeIds.map((id) => sql`${id}`), sql`, `)})` as any,
      );
    }

    const managers = await this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        storeId: users.storeId,
        brandId: users.brandId,
      })
      .from(users)
      .where(and(...managerConds));

    if (managers.length === 0) return { period: { from, to }, data: [] };

    // Aggregate sales per counter-manager store (each manager owns one store)
    const managerStoreIds = Array.from(
      new Set(managers.map((m) => m.storeId).filter((s): s is string => Boolean(s))),
    );

    const salesByStore = managerStoreIds.length
      ? await this.db
          .select({
            storeId: orders.storeId,
            totalAmount: sql<string>`coalesce(sum(${orders.totalPrice}), 0)`,
            orderCount: count(),
          })
          .from(orders)
          .where(
            and(
              gte(orders.processedAt, from),
              lte(orders.processedAt, to),
              inArray(orders.storeId, managerStoreIds),
            ),
          )
          .groupBy(orders.storeId)
      : [];

    const salesMap = new Map(salesByStore.map((r) => [r.storeId, r]));

    const data = managers.map((m) => {
      const sales = m.storeId ? salesMap.get(m.storeId) : undefined;
      return {
        userId: m.id,
        fullName: m.fullName,
        storeId: m.storeId,
        brandId: m.brandId,
        sales: {
          totalAmount: Number(sales?.totalAmount ?? 0),
          orderCount: sales?.orderCount ?? 0,
        },
      };
    });

    data.sort((a, b) => b.sales.totalAmount - a.sales.totalAmount);

    return { period: { from, to }, data };
  }

  /**
   * Brand-by-brand comparison inside a single store. Lets the Area Manager
   * answer "how is Lancôme doing vs. YSL at Liverpool Polanco?".
   */
  async getStoreBrandsComparison(
    user: SessionUser,
    storeId: string,
    range?: DateRange,
  ) {
    // Scope check
    if (user.role !== UserRole.ADMIN) {
      const accessible = await this.scopeService.getAccessibleStoreIds(user);
      if (!accessible.includes(storeId)) {
        throw new ForbiddenException("You do not have access to this store");
      }
    }

    const { from, to } = getDefaultDateRange(range);

    const brandsAtStore = await this.db
      .select({
        id: brands.id,
        displayName: brands.displayName,
        divisionId: brands.divisionId,
      })
      .from(brands)
      .innerJoin(brandStores, eq(brandStores.brandId, brands.id))
      .where(eq(brandStores.storeId, storeId));

    if (brandsAtStore.length === 0) {
      return { storeId, period: { from, to }, data: [] };
    }

    // Sales by brand (line_items → products.brandId)
    const salesByBrand = await this.db
      .select({
        brandId: products.brandId,
        totalAmount: sql<string>`coalesce(sum(${lineItems.price}), 0)`,
        itemCount: count(),
      })
      .from(lineItems)
      .innerJoin(orders, eq(lineItems.orderId, orders.id))
      .innerJoin(products, eq(lineItems.productId, products.id))
      .where(
        and(
          eq(orders.storeId, storeId),
          gte(orders.processedAt, from),
          lte(orders.processedAt, to),
        ),
      )
      .groupBy(products.brandId);

    const salesMap = new Map(salesByBrand.map((r) => [r.brandId, r]));

    // Recommendations by brand — join through products
    const recByBrand = await this.db
      .select({
        brandId: products.brandId,
        total: count(),
        converted: sql<number>`count(*) filter (where ${recommendations.isConverted} = true)::int`,
      })
      .from(recommendations)
      .innerJoin(products, eq(products.id, recommendations.productId))
      .where(
        and(
          eq(recommendations.storeId, storeId),
          gte(recommendations.recommendedAt, from),
          lte(recommendations.recommendedAt, to),
        ),
      )
      .groupBy(products.brandId);

    const recMap = new Map(recByBrand.map((r) => [r.brandId, r]));

    const data = brandsAtStore.map((b) => {
      const sales = salesMap.get(b.id);
      const recs = recMap.get(b.id);
      const total = recs?.total ?? 0;
      return {
        brandId: b.id,
        brandName: b.displayName,
        divisionId: b.divisionId,
        sales: {
          totalAmount: Number(sales?.totalAmount ?? 0),
          itemCount: sales?.itemCount ?? 0,
        },
        recommendations: {
          total,
          converted: recs?.converted ?? 0,
          conversionPct:
            total > 0 ? Math.round(((recs?.converted ?? 0) / total) * 100) : null,
        },
      };
    });

    data.sort((a, b) => b.sales.totalAmount - a.sales.totalAmount);

    return { storeId, period: { from, to }, data };
  }

  /**
   * Cross-zone ranking inside the user's division. Lets the National Retail
   * Manager answer questions like "which zone is performing best for Luxe?".
   * Each row aggregates every store in the zone (within the user's scope).
   */
  async getZonesRanking(user: SessionUser, range?: DateRange) {
    if (
      user.role !== UserRole.NATIONAL_RETAIL_MANAGER &&
      user.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        "Zones ranking is restricted to national_retail_manager and admin",
      );
    }

    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === UserRole.ADMIN;
    const { from, to } = getDefaultDateRange(range);

    if (!isAdmin && storeIds.length === 0) {
      return { period: { from, to }, data: [] };
    }

    // Sales per (zone via store)
    const orderConds: any[] = [
      gte(orders.processedAt, from),
      lte(orders.processedAt, to),
    ];
    if (!isAdmin) orderConds.push(inArray(orders.storeId, storeIds));

    const salesRows = await this.db
      .select({
        zoneId: stores.zoneId,
        totalAmount: sql<string>`coalesce(sum(${orders.totalPrice}), 0)`,
        orderCount: count(),
        uniqueCustomers: sql<number>`count(distinct ${orders.customerId})::int`,
      })
      .from(orders)
      .innerJoin(stores, eq(stores.id, orders.storeId))
      .where(and(...orderConds))
      .groupBy(stores.zoneId);

    // New customers per zone
    const newConds: any[] = [
      gte(customers.enrolledAt, from),
      lte(customers.enrolledAt, to),
    ];
    if (!isAdmin) newConds.push(inArray(customers.signupStoreId, storeIds));

    const newRows = await this.db
      .select({
        zoneId: stores.zoneId,
        count: count(),
      })
      .from(customers)
      .innerJoin(stores, eq(stores.id, customers.signupStoreId))
      .where(and(...newConds))
      .groupBy(stores.zoneId);

    // Store count per zone (within the user's scope)
    const storeCountConds: any[] = [];
    if (!isAdmin) storeCountConds.push(inArray(stores.id, storeIds));
    const storeCountRows = await this.db
      .select({
        zoneId: stores.zoneId,
        count: count(),
      })
      .from(stores)
      .where(storeCountConds.length ? and(...storeCountConds) : undefined)
      .groupBy(stores.zoneId);

    // Recommendations per zone
    const recConds: any[] = [
      gte(recommendations.recommendedAt, from),
      lte(recommendations.recommendedAt, to),
    ];
    if (!isAdmin) recConds.push(inArray(recommendations.storeId, storeIds));

    const recRows = await this.db
      .select({
        zoneId: stores.zoneId,
        total: count(),
        converted: sql<number>`count(*) filter (where ${recommendations.isConverted} = true)::int`,
      })
      .from(recommendations)
      .innerJoin(stores, eq(stores.id, recommendations.storeId))
      .where(and(...recConds))
      .groupBy(stores.zoneId);

    // Zone metadata
    const zoneRows = await this.db
      .select({
        id: zones.id,
        code: zones.code,
        displayName: zones.displayName,
      })
      .from(zones);

    const salesMap = new Map(salesRows.map((r) => [r.zoneId, r]));
    const newMap = new Map(newRows.map((r) => [r.zoneId, r.count]));
    const storeCountMap = new Map(storeCountRows.map((r) => [r.zoneId, r.count]));
    const recMap = new Map(recRows.map((r) => [r.zoneId, r]));

    // Only include zones that have at least one store in the user's scope
    const visibleZoneIds = isAdmin
      ? new Set(zoneRows.map((z) => z.id))
      : new Set(
          storeCountRows
            .map((r) => r.zoneId)
            .filter((id): id is string => Boolean(id)),
        );

    const data = zoneRows
      .filter((z) => visibleZoneIds.has(z.id))
      .map((z) => {
        const sales = salesMap.get(z.id);
        const recs = recMap.get(z.id);
        const totalAmount = Number(sales?.totalAmount ?? 0);
        const orderCount = sales?.orderCount ?? 0;
        const totalRecs = recs?.total ?? 0;
        return {
          zoneId: z.id,
          zoneCode: z.code,
          zoneName: z.displayName,
          storeCount: storeCountMap.get(z.id) ?? 0,
          sales: {
            totalAmount,
            orderCount,
            uniqueCustomers: sales?.uniqueCustomers ?? 0,
            avgTicket: orderCount > 0 ? totalAmount / orderCount : 0,
          },
          newCustomers: newMap.get(z.id) ?? 0,
          recommendations: {
            total: totalRecs,
            converted: recs?.converted ?? 0,
            conversionPct:
              totalRecs > 0
                ? Math.round(((recs?.converted ?? 0) / totalRecs) * 100)
                : null,
          },
        };
      });

    data.sort((a, b) => b.sales.totalAmount - a.sales.totalAmount);

    return { period: { from, to }, data };
  }
}
