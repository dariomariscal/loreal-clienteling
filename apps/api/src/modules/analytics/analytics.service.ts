import { Injectable, Inject } from "@nestjs/common";
import { and, eq, gte, lte, count, sum, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  customers,
  orders,
  lineItems,
  products,
  appointments,
  messages,
  users,
  stores,
  serviceTypes,
  brands,
  zones,
} from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { resolveScopedFilters } from "./shared/filter-resolution";
import type { ReportFiltersInput } from "./shared/report-filters";
import { AppointmentsAnalyticsService } from "./appointments/appointments-analytics.service";
import { SalesAnalyticsService } from "./sales/sales-analytics.service";
import { CustomersAnalyticsService } from "./customers/customers-analytics.service";
import { RecommendationsAnalyticsService } from "./recommendations/recommendations-analytics.service";
import { PerformanceAnalyticsService } from "./performance/performance-analytics.service";
import { ZoneAnalyticsService } from "./zone-management/zone-analytics.service";
import { SalesTargetsAnalyticsService } from "./sales-targets/sales-targets-analytics.service";
import { RatingsAnalyticsService } from "./ratings/ratings-analytics.service";
import { AiUsageAnalyticsService } from "./ai-usage/ai-usage-analytics.service";
import { HeatmapAnalyticsService } from "./heatmap/heatmap-analytics.service";
import { PipelineAnalyticsService } from "./pipeline/pipeline-analytics.service";
import { VipAnalyticsService } from "./vip/vip-analytics.service";
import { FilterOptionsService } from "./filter-options/filter-options.service";
import { getDefaultDateRange, type DateRange } from "./shared/analytics-date.util";
import { buildStoreScopeFilter } from "./shared/analytics-scope.util";

/**
 * Facade for all analytics queries. Each domain (appointments, sales,
 * customers, recommendations, performance, zone-management) lives in its
 * own service and is exposed here as a named namespace, e.g.
 *
 *   analytics.appointments.getOverview(user, range)
 *   analytics.sales.getTrend(user, "month", range)
 *
 * The facade itself only holds genuinely cross-domain queries
 * (`getDashboard`, `exportData`) that aggregate across multiple domains
 * and don't belong to any single one.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    public readonly appointments: AppointmentsAnalyticsService,
    public readonly sales: SalesAnalyticsService,
    public readonly customers: CustomersAnalyticsService,
    public readonly recommendations: RecommendationsAnalyticsService,
    public readonly performance: PerformanceAnalyticsService,
    public readonly zoneManagement: ZoneAnalyticsService,
    public readonly salesTargets: SalesTargetsAnalyticsService,
    public readonly ratings: RatingsAnalyticsService,
    public readonly aiUsage: AiUsageAnalyticsService,
    public readonly heatmap: HeatmapAnalyticsService,
    public readonly pipeline: PipelineAnalyticsService,
    public readonly vip: VipAnalyticsService,
    public readonly filterOptions: FilterOptionsService,
  ) {}

  /**
   * Cross-domain home dashboard: totals customers + sales + appointments +
   * new customers + messages, all scoped to the caller. Lives on the facade
   * because it spans every domain.
   */
  async getDashboard(user: SessionUser, range?: DateRange) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === UserRole.ADMIN;
    const isBA = user.role === UserRole.BEAUTY_ADVISOR;
    const { from, to } = getDefaultDateRange(range);
    const storeFilter = buildStoreScopeFilter(isAdmin, storeIds, customers.signupStoreId);

    // Total customers
    const customerConditions = storeFilter ? [storeFilter] : [];
    const [customerCount] = await this.db
      .select({ count: count() })
      .from(customers)
      .where(customerConditions.length > 0 ? and(...customerConditions) : undefined);

    // Sales in period
    const orderConditions = [gte(orders.processedAt, from), lte(orders.processedAt, to)];
    const orderStoreFilter = buildStoreScopeFilter(isAdmin, storeIds, orders.storeId);
    if (orderStoreFilter) orderConditions.push(orderStoreFilter as any);

    const [salesData] = await this.db
      .select({ total: sum(orders.totalPrice), count: count() })
      .from(orders)
      .where(and(...orderConditions));

    // Appointments in period
    const apptConditions = [gte(appointments.startTime, from), lte(appointments.startTime, to)];
    const apptStoreFilter = buildStoreScopeFilter(isAdmin, storeIds, appointments.storeId);
    if (apptStoreFilter) apptConditions.push(apptStoreFilter as any);

    const [apptCount] = await this.db
      .select({ count: count() })
      .from(appointments)
      .where(and(...apptConditions));

    // New customers in period.
    // BA → only the ones they personally registered (attribution metric, RFP :55).
    // counter+ → all enrollments in their accessible stores.
    const newConditions = [gte(customers.enrolledAt, from), lte(customers.enrolledAt, to)];
    if (isBA) {
      newConditions.push(eq(customers.createdByUserId, user.id) as any);
    } else if (storeFilter) {
      newConditions.push(storeFilter as any);
    }

    const [newCustomers] = await this.db
      .select({ count: count() })
      .from(customers)
      .where(and(...newConditions));

    // Messages in period.
    // BA → only the ones they sent personally.
    // counter_manager / area_manager / national_retail_manager → every message
    //   whose sender belongs to a store in their scope. Join users to resolve
    //   the sender's store since messages has no storeId column.
    // admin → no scope filter.
    const msgConditions = [gte(messages.sentAt, from), lte(messages.sentAt, to)];
    let msgQuery;
    if (isBA) {
      msgConditions.push(eq(messages.sentByUserId, user.id) as any);
      msgQuery = this.db.select({ count: count() }).from(messages);
    } else if (isAdmin) {
      msgQuery = this.db.select({ count: count() }).from(messages);
    } else {
      // Manager-tier: scope by sender's store. storeIds is already the
      // resolved list for area / national / counter manager.
      msgConditions.push(inArray(users.storeId, storeIds) as any);
      msgQuery = this.db
        .select({ count: count() })
        .from(messages)
        .innerJoin(users, eq(messages.sentByUserId, users.id));
    }
    const [msgCount] = await msgQuery.where(and(...msgConditions));

    return {
      totalCustomers: customerCount?.count ?? 0,
      sales: {
        totalAmount: salesData?.total ?? "0",
        orderCount: salesData?.count ?? 0,
      },
      appointments: apptCount?.count ?? 0,
      newCustomers: newCustomers?.count ?? 0,
      messagesSent: msgCount?.count ?? 0,
      period: { from, to },
    };
  }

  /**
   * Cross-domain raw export: returns scoped rows of customers / sales /
   * appointments / ba-performance / stores-ranking / banners-ranking. Used by
   * the /analytics/export endpoint for CSV / XLSX downloads. Lives on the
   * facade because it pivots across domains by the `type` parameter rather
   * than belonging to a single one.
   *
   * Honours the full ReportFiltersInput (from, to, banner, brandId, storeId,
   * baUserId, zoneId) via resolveScopedFilters so an export reflects exactly
   * what the user sees on screen with the filter bar.
   */
  async exportData(
    type: string,
    user: SessionUser,
    filters: ReportFiltersInput = {},
  ) {
    const accessibleStoreIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
    const { from, to } = getDefaultDateRange({ from: filters.from, to: filters.to });

    const resolved = await resolveScopedFilters(
      this.db,
      isAdmin,
      accessibleStoreIds,
      filters,
    );
    if (resolved.emptyByBrandConflict) return [];
    const { storeIds, baUserId, brandId } = resolved;

    if (type === "customers") {
      const conditions: any[] = [];
      if (storeIds != null) {
        if (storeIds.length === 0) return [];
        conditions.push(inArray(customers.signupStoreId, storeIds));
      }
      if (baUserId) {
        conditions.push(eq(customers.lastBaUserId, baUserId));
      }

      const lastBa = alias(users, "last_ba");

      const rows = await this.db
        .select({
          customerId: customers.id,
          firstName: customers.firstName,
          lastName: customers.lastName,
          email: customers.email,
          phone: customers.phone,
          gender: customers.gender,
          birthDate: customers.birthday,
          lifecycleSegment: customers.lifecycleStage,
          loyaltyTier: customers.loyaltyTier,
          totalSpent: customers.totalSpent,
          ordersCount: customers.ordersCount,
          customerSince: customers.enrolledAt,
          lastContactAt: customers.lastInteractionAt,
          lastTransactionAt: customers.lastOrderAt,
          lastVisitAt: customers.lastVisitAt,
          lastBaUserId: customers.lastBaUserId,
          lastBaName: lastBa.fullName,
          lastFollowUpType: customers.lastFollowUpType,
          lastFollowUpCompletedAt: customers.lastFollowUpCompletedAt,
          nextFollowUpType: customers.nextFollowUpType,
          nextFollowUpDueDate: customers.nextFollowUpDueDate,
          openFollowUpCount: customers.openFollowUpCount,
          overdueFollowUpCount: customers.overdueFollowUpCount,
          storeId: customers.signupStoreId,
          storeName: stores.displayName,
          banner: stores.banner,
        })
        .from(customers)
        .leftJoin(stores, eq(stores.id, customers.signupStoreId))
        .leftJoin(lastBa, eq(lastBa.id, customers.lastBaUserId))
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return rows;
    }

    if (type === "sales") {
      const conditions: any[] = [
        gte(orders.processedAt, from),
        lte(orders.processedAt, to),
      ];
      if (storeIds != null) {
        if (storeIds.length === 0) return [];
        conditions.push(inArray(orders.storeId, storeIds));
      }
      if (baUserId) conditions.push(eq(orders.attributedUserId, baUserId));

      // brand → narrow via lineItems → products, but only when filter is set
      // to avoid a join cost on every sales export.
      if (brandId) {
        const orderIdsWithBrand = this.db
          .select({ orderId: lineItems.orderId })
          .from(lineItems)
          .innerJoin(products, eq(products.id, lineItems.productId))
          .where(eq(products.brandId, brandId));
        conditions.push(inArray(orders.id, orderIdsWithBrand));
      }

      // Aggregated line-items per order in a single subquery so each order
      // still gets exactly one row but we can show #items and #units columns
      // without a GROUP BY on the outer query.
      const itemsAgg = this.db
        .select({
          orderId: lineItems.orderId,
          lineCount: sql<number>`COUNT(*)::int`.as("line_count"),
          unitCount: sql<number>`COALESCE(SUM(${lineItems.quantity}), 0)::int`.as(
            "unit_count",
          ),
        })
        .from(lineItems)
        .groupBy(lineItems.orderId)
        .as("items_agg");

      const baBrand = alias(brands, "ba_brand");

      const rows = await this.db
        .select({
          orderNumber: orders.orderNumber,
          purchasedAt: orders.processedAt,
          channel: orders.channel,
          source: orders.sourceName,
          externalOrderId: orders.externalOrderId,
          customerId: orders.customerId,
          customerName: sql<string>`${customers.firstName} || ' ' || ${customers.lastName}`,
          customerEmail: customers.email,
          phone: customers.phone,
          lifecycleSegment: customers.lifecycleStage,
          loyaltyTier: customers.loyaltyTier,
          attributedBaUserId: orders.attributedUserId,
          attributedBaName: users.fullName,
          baEmail: users.email,
          baBrandName: baBrand.displayName,
          attributedBaSource: orders.attributionSource,
          storeId: orders.storeId,
          storeCode: stores.code,
          storeName: stores.displayName,
          banner: stores.banner,
          city: stores.city,
          state: stores.state,
          zoneCode: zones.code,
          zoneName: zones.displayName,
          lineCount: itemsAgg.lineCount,
          unitCount: itemsAgg.unitCount,
          currency: orders.currency,
          subtotal: orders.subtotalPrice,
          totalDiscount: orders.totalDiscounts,
          totalTax: orders.totalTax,
          totalShipping: orders.totalShipping,
          totalAmount: orders.totalPrice,
          financialStatus: orders.financialStatus,
          fulfillmentStatus: orders.fulfillmentStatus,
        })
        .from(orders)
        .leftJoin(customers, eq(customers.id, orders.customerId))
        .leftJoin(stores, eq(stores.id, orders.storeId))
        .leftJoin(zones, eq(zones.id, stores.zoneId))
        .leftJoin(users, eq(users.id, orders.attributedUserId))
        .leftJoin(baBrand, eq(baBrand.id, sql`${users.brandId}::uuid`))
        .leftJoin(itemsAgg, eq(itemsAgg.orderId, orders.id))
        .where(and(...conditions))
        .orderBy(orders.processedAt);

      return rows;
    }

    if (type === "appointments") {
      const conditions: any[] = [
        gte(appointments.startTime, from),
        lte(appointments.startTime, to),
      ];
      if (storeIds != null) {
        if (storeIds.length === 0) return [];
        conditions.push(inArray(appointments.storeId, storeIds));
      }
      if (baUserId) conditions.push(eq(appointments.staffUserId, baUserId));

      const rows = await this.db
        .select({
          id: appointments.id,
          scheduledAt: appointments.startTime,
          durationMinutes: appointments.durationMinutes,
          eventTypeId: appointments.serviceTypeId,
          eventTypeName: serviceTypes.displayName,
          status: appointments.status,
          comments: appointments.notes,
          isVirtual: appointments.isVirtual,
          customerName: sql<string>`${customers.firstName} || ' ' || ${customers.lastName}`,
          customerPhone: customers.phone,
          customerId: appointments.customerId,
          baName: users.fullName,
          baUserId: appointments.staffUserId,
          storeName: stores.displayName,
          storeId: appointments.storeId,
        })
        .from(appointments)
        .leftJoin(customers, eq(customers.id, appointments.customerId))
        .leftJoin(users, eq(users.id, appointments.staffUserId))
        .leftJoin(stores, eq(stores.id, appointments.storeId))
        .leftJoin(serviceTypes, eq(serviceTypes.id, appointments.serviceTypeId))
        .where(and(...conditions));

      return rows;
    }

    // Aggregated exports: delegate to the domain service and flatten the
    // response into a flat record shape that CSV/XLSX writers can consume.
    if (type === "ba-performance") {
      const rows = await this.performance.getBaSummary(user, filters);
      if (rows.length === 0) return [];

      // Resolve store + zone + brand + email for each BA in a single query so
      // the export carries the context the summary doesn't expose.
      const baIds = rows.map((r) => r.baId);
      const baContext = await this.db
        .select({
          baId: users.id,
          baEmail: users.email,
          baBrandId: sql<string | null>`${users.brandId}`,
          storeId: users.storeId,
          storeCode: stores.code,
          storeName: stores.displayName,
          banner: stores.banner,
          city: stores.city,
          state: stores.state,
          zoneCode: zones.code,
          zoneName: zones.displayName,
        })
        .from(users)
        .leftJoin(stores, eq(stores.id, users.storeId))
        .leftJoin(zones, eq(zones.id, stores.zoneId))
        .where(inArray(users.id, baIds));

      const brandIds = baContext
        .map((c) => c.baBrandId)
        .filter((id): id is string => Boolean(id));
      const brandRows = brandIds.length
        ? await this.db
            .select({ id: brands.id, displayName: brands.displayName })
            .from(brands)
            .where(sql`${brands.id}::text IN (${sql.join(brandIds.map((id) => sql`${id}`), sql`, `)})`)
        : [];
      const brandMap = new Map(brandRows.map((b) => [b.id, b.displayName]));
      const contextMap = new Map(baContext.map((c) => [c.baId, c]));

      // Last attributed order per BA → "last activity" signal.
      const lastActivityRows = await this.db
        .select({
          baId: orders.attributedUserId,
          lastActivityAt: sql<Date | null>`MAX(${orders.processedAt})`,
        })
        .from(orders)
        .where(inArray(orders.attributedUserId, baIds))
        .groupBy(orders.attributedUserId);
      const lastActivityMap = new Map(
        lastActivityRows.map((r) => [r.baId, r.lastActivityAt]),
      );

      return rows.map((r) => {
        const ctx = contextMap.get(r.baId);
        const total = Number(r.sales.totalAmount ?? 0);
        const orderCount = r.sales.orderCount ?? 0;
        const avgTicket = orderCount > 0 ? total / orderCount : 0;
        return {
          baUserId: r.baId,
          baName: r.fullName,
          baEmail: ctx?.baEmail ?? null,
          baBrandName: ctx?.baBrandId ? brandMap.get(ctx.baBrandId) ?? null : null,
          storeId: r.storeId,
          storeCode: ctx?.storeCode ?? null,
          storeName: ctx?.storeName ?? null,
          banner: ctx?.banner ?? null,
          city: ctx?.city ?? null,
          state: ctx?.state ?? null,
          zoneCode: ctx?.zoneCode ?? null,
          zoneName: ctx?.zoneName ?? null,
          salesTotalAmount: r.sales.totalAmount,
          salesOrderCount: orderCount,
          salesAvgTicket: avgTicket.toFixed(2),
          registrations: r.registrations,
          messagesSent: r.messagesSent,
          recommendationsTotal: r.recommendations.total,
          recommendationsConverted: r.recommendations.converted,
          recommendationsConversionRate: r.recommendations.conversionRate,
          followUpsTotal: r.followUps.total,
          followUpsCompleted: r.followUps.completed,
          followUpsDismissed: r.followUps.dismissed,
          followUpsOverdue: r.followUps.overdue,
          followUpsCompletionRate: r.followUps.completionRate,
          lastActivityAt: lastActivityMap.get(r.baId) ?? null,
        };
      });
    }

    if (type === "stores-ranking") {
      const { data } = await this.zoneManagement.getStoresRanking(user, filters, {});
      if (data.length === 0) return [];

      const storeRowIds = data.map((r) => r.storeId);
      const storeContext = await this.db
        .select({
          storeId: stores.id,
          storeCode: stores.code,
          city: stores.city,
          state: stores.state,
          zoneCode: zones.code,
          zoneName: zones.displayName,
        })
        .from(stores)
        .leftJoin(zones, eq(zones.id, stores.zoneId))
        .where(inArray(stores.id, storeRowIds));
      const ctxMap = new Map(storeContext.map((c) => [c.storeId, c]));

      // Appointments completed per store in the period for the activity column.
      const apptRows = await this.db
        .select({
          storeId: appointments.storeId,
          appointmentsCount: count(),
        })
        .from(appointments)
        .where(
          and(
            inArray(appointments.storeId, storeRowIds),
            gte(appointments.startTime, from),
            lte(appointments.startTime, to),
          ),
        )
        .groupBy(appointments.storeId);
      const apptMap = new Map(apptRows.map((r) => [r.storeId, r.appointmentsCount]));

      return data.map((r) => {
        const ctx = ctxMap.get(r.storeId);
        return {
          storeId: r.storeId,
          storeCode: ctx?.storeCode ?? null,
          storeName: r.storeName,
          banner: r.banner,
          city: ctx?.city ?? null,
          state: ctx?.state ?? null,
          zoneId: r.zoneId,
          zoneCode: ctx?.zoneCode ?? null,
          zoneName: ctx?.zoneName ?? null,
          salesTotalAmount: r.sales.totalAmount,
          salesOrderCount: r.sales.orderCount,
          salesAvgTicket: r.sales.avgTicket,
          salesUniqueCustomers: r.sales.uniqueCustomers,
          newCustomers: r.newCustomers,
          recommendationsTotal: r.recommendations.total,
          recommendationsConverted: r.recommendations.converted,
          recommendationsConversionPct: r.recommendations.conversionPct,
          appointmentsCount: apptMap.get(r.storeId) ?? 0,
        };
      });
    }

    if (type === "banners-ranking") {
      const res = await this.zoneManagement.getBannersRanking(user, filters);
      return res.data.map((r) => ({
        banner: r.banner,
        bannerName: r.bannerName,
        storeCount: r.storeCount,
        salesTotalAmount: r.sales.totalAmount,
        salesOrderCount: r.sales.orderCount,
        salesUniqueCustomers: r.sales.uniqueCustomers,
        salesAvgTicket: r.sales.avgTicket,
        newCustomers: r.newCustomers,
      }));
    }

    if (type === "sales-trend") {
      const res = await this.sales.getTrend(user, "day", filters);
      return res.data.map((p) => ({
        date: p.date,
        totalAmount: p.totalAmount,
        orderCount: p.orderCount,
      }));
    }

    if (type === "sales-breakdown") {
      const res = await this.sales.getBreakdown(user, "brand", filters);
      return res.data.map((r) => ({
        groupBy: res.groupBy,
        key: (r as any).category ?? (r as any).brandId ?? "",
        label: (r as any).brandName ?? (r as any).category ?? "",
        totalAmount: r.totalAmount,
        itemCount: r.itemCount,
      }));
    }

    return [];
  }
}
