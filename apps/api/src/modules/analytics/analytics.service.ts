import { Injectable, Inject, ForbiddenException } from "@nestjs/common";
import { eq, and, gte, lte, sql, count, sum, inArray } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  customers,
  orders,
  lineItems,
  recommendations,
  appointments,
  serviceTypes,
  messages,
  samples,
  products,
  users,
  stores,
  brands,
  brandStores,
  zones,
} from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";

interface DateRange {
  from?: Date;
  to?: Date;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  private getDefaultDateRange(range?: DateRange): { from: Date; to: Date } {
    const to = range?.to ?? new Date();
    const from = range?.from ?? (() => {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    })();
    return { from, to };
  }

  private buildStoreFilter(isAdmin: boolean, storeIds: string[], storeIdColumn: any) {
    if (isAdmin) return undefined;
    return sql`${storeIdColumn} IN (${sql.join(storeIds.map((id) => sql`${id}`), sql`, `)})`;
  }

  async getDashboard(user: SessionUser, range?: DateRange) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
    const { from, to } = this.getDefaultDateRange(range);
    const storeFilter = this.buildStoreFilter(isAdmin, storeIds, customers.signupStoreId);

    // Total customers
    const customerConditions = storeFilter ? [storeFilter] : [];
    const [customerCount] = await this.db
      .select({ count: count() })
      .from(customers)
      .where(customerConditions.length > 0 ? and(...customerConditions) : undefined);

    // Sales in period
    const orderConditions = [gte(orders.processedAt, from), lte(orders.processedAt, to)];
    const orderStoreFilter = this.buildStoreFilter(isAdmin, storeIds, orders.storeId);
    if (orderStoreFilter) orderConditions.push(orderStoreFilter as any);

    const [salesData] = await this.db
      .select({ total: sum(orders.totalPrice), count: count() })
      .from(orders)
      .where(and(...orderConditions));

    // Appointments in period
    const apptConditions = [gte(appointments.startTime, from), lte(appointments.startTime, to)];
    const apptStoreFilter = this.buildStoreFilter(isAdmin, storeIds, appointments.storeId);
    if (apptStoreFilter) apptConditions.push(apptStoreFilter as any);

    const [apptCount] = await this.db
      .select({ count: count() })
      .from(appointments)
      .where(and(...apptConditions));

    // New customers in period
    const newConditions = [gte(customers.enrolledAt, from), lte(customers.enrolledAt, to)];
    if (storeFilter) newConditions.push(storeFilter as any);

    const [newCustomers] = await this.db
      .select({ count: count() })
      .from(customers)
      .where(and(...newConditions));

    // Messages in period
    const msgConditions = [gte(messages.sentAt, from), lte(messages.sentAt, to)];
    const msgUserFilter = isAdmin ? undefined : eq(messages.sentByUserId, user.id);
    if (msgUserFilter) msgConditions.push(msgUserFilter as any);

    const [msgCount] = await this.db
      .select({ count: count() })
      .from(messages)
      .where(and(...msgConditions));

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

  async getAppointmentMetrics(user: SessionUser, range?: DateRange) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
    const { from, to } = this.getDefaultDateRange(range);

    const baseConditions = [gte(appointments.startTime, from), lte(appointments.startTime, to)];
    const storeFilter = this.buildStoreFilter(isAdmin, storeIds, appointments.storeId);
    if (storeFilter) baseConditions.push(storeFilter as any);

    const result = await this.db
      .select({
        status: appointments.status,
        count: count(),
      })
      .from(appointments)
      .where(and(...baseConditions))
      .groupBy(appointments.status);

    const statusMap: Record<string, number> = {};
    for (const row of result) {
      statusMap[row.status] = row.count;
    }

    return {
      total: Object.values(statusMap).reduce((a, b) => a + b, 0),
      scheduled: statusMap["scheduled"] ?? 0,
      confirmed: statusMap["confirmed"] ?? 0,
      completed: statusMap["completed"] ?? 0,
      rescheduled: statusMap["rescheduled"] ?? 0,
      cancelled: statusMap["cancelled"] ?? 0,
      noShow: statusMap["no_show"] ?? 0,
      period: { from, to },
    };
  }

  async getBaPerformance(user: SessionUser, range?: DateRange) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
    const { from, to } = this.getDefaultDateRange(range);

    // Get BAs accessible to this user
    const baConditions = [eq(users.role, "beauty_advisor"), eq(users.isActive, true)];
    if (!isAdmin && storeIds.length > 0) {
      baConditions.push(
        sql`${users.storeId} IN (${sql.join(storeIds.map((id) => sql`${id}`), sql`, `)})` as any,
      );
    }

    const bas = await this.db
      .select({ id: users.id, fullName: users.fullName, storeId: users.storeId })
      .from(users)
      .where(and(...baConditions));

    if (bas.length === 0) return [];

    const baIds = bas.map((b) => b.id);

    // Sales per BA
    const salesRows = await this.db
      .select({
        baId: orders.attributedUserId,
        totalAmount: sum(orders.totalPrice),
        orderCount: count(),
      })
      .from(orders)
      .where(
        and(
          sql`${orders.attributedUserId} IN (${sql.join(baIds.map((id) => sql`${id}`), sql`, `)})`,
          gte(orders.processedAt, from),
          lte(orders.processedAt, to),
        ),
      )
      .groupBy(orders.attributedUserId);

    const salesMap = new Map(salesRows.map((r) => [r.baId, r]));

    // Registrations per BA
    const regRows = await this.db
      .select({
        baId: customers.createdByUserId,
        count: count(),
      })
      .from(customers)
      .where(
        and(
          sql`${customers.createdByUserId} IN (${sql.join(baIds.map((id) => sql`${id}`), sql`, `)})`,
          gte(customers.enrolledAt, from),
          lte(customers.enrolledAt, to),
        ),
      )
      .groupBy(customers.createdByUserId);

    const regMap = new Map(regRows.map((r) => [r.baId, r.count]));

    // Messages per BA
    const msgRows = await this.db
      .select({
        baId: messages.sentByUserId,
        count: count(),
      })
      .from(messages)
      .where(
        and(
          sql`${messages.sentByUserId} IN (${sql.join(baIds.map((id) => sql`${id}`), sql`, `)})`,
          gte(messages.sentAt, from),
          lte(messages.sentAt, to),
        ),
      )
      .groupBy(messages.sentByUserId);

    const msgMap = new Map(msgRows.map((r) => [r.baId, r.count]));

    // Recommendations per BA (total and converted)
    const recRows = await this.db
      .select({
        baId: recommendations.recommendedByUserId,
        total: count(),
        converted: sql<number>`COUNT(*) FILTER (WHERE ${recommendations.isConverted} = true)`,
      })
      .from(recommendations)
      .where(
        and(
          sql`${recommendations.recommendedByUserId} IN (${sql.join(baIds.map((id) => sql`${id}`), sql`, `)})`,
          gte(recommendations.recommendedAt, from),
          lte(recommendations.recommendedAt, to),
        ),
      )
      .groupBy(recommendations.recommendedByUserId);

    const recMap = new Map(recRows.map((r) => [r.baId, r]));

    return bas.map((ba) => {
      const sales = salesMap.get(ba.id);
      const recs = recMap.get(ba.id);
      const totalRecs = recs?.total ?? 0;
      const convertedRecs = recs?.converted ?? 0;

      return {
        baId: ba.id,
        fullName: ba.fullName,
        storeId: ba.storeId,
        sales: {
          totalAmount: sales?.totalAmount ?? "0",
          orderCount: sales?.orderCount ?? 0,
        },
        registrations: regMap.get(ba.id) ?? 0,
        messagesSent: msgMap.get(ba.id) ?? 0,
        recommendations: {
          total: totalRecs,
          converted: convertedRecs,
          conversionRate: totalRecs > 0 ? convertedRecs / totalRecs : 0,
        },
      };
    });
  }

  async getSalesTrend(
    user: SessionUser,
    interval: "day" | "week" | "month",
    range?: DateRange,
  ) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";

    // Default to last 6 months for trend
    const to = range?.to ?? new Date();
    const from = range?.from ?? (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 6);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    })();

    const conditions = [gte(orders.processedAt, from), lte(orders.processedAt, to)];
    const storeFilter = this.buildStoreFilter(isAdmin, storeIds, orders.storeId);
    if (storeFilter) conditions.push(storeFilter as any);

    const dateTrunc = sql`date_trunc(${sql.raw(`'${interval}'`)}, ${orders.processedAt})`;

    const rows = await this.db
      .select({
        period: dateTrunc.as("period"),
        totalAmount: sum(orders.totalPrice),
        orderCount: count(),
      })
      .from(orders)
      .where(and(...conditions))
      .groupBy(dateTrunc)
      .orderBy(dateTrunc);

    return {
      interval,
      data: rows.map((r) => ({
        date: r.period,
        totalAmount: r.totalAmount ?? "0",
        orderCount: r.orderCount,
      })),
      period: { from, to },
    };
  }

  async getSalesBreakdown(
    user: SessionUser,
    groupBy: "category" | "brand",
    range?: DateRange,
  ) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
    const { from, to } = this.getDefaultDateRange(range);

    const conditions = [gte(orders.processedAt, from), lte(orders.processedAt, to)];
    const storeFilter = this.buildStoreFilter(isAdmin, storeIds, orders.storeId);
    if (storeFilter) conditions.push(storeFilter as any);

    if (groupBy === "category") {
      const rows = await this.db
        .select({
          category: products.category,
          totalAmount: sum(lineItems.price),
          itemCount: count(),
        })
        .from(lineItems)
        .innerJoin(orders, eq(lineItems.orderId, orders.id))
        .innerJoin(products, eq(lineItems.productId, products.id))
        .where(and(...conditions))
        .groupBy(products.category);

      return { groupBy: "category", data: rows, period: { from, to } };
    }

    // groupBy === "brand"
    const rows = await this.db
      .select({
        brandId: products.brandId,
        totalAmount: sum(lineItems.price),
        itemCount: count(),
      })
      .from(lineItems)
      .innerJoin(orders, eq(lineItems.orderId, orders.id))
      .innerJoin(products, eq(lineItems.productId, products.id))
      .where(and(...conditions))
      .groupBy(products.brandId);

    return { groupBy: "brand", data: rows, period: { from, to } };
  }

  async getConversion(user: SessionUser, range?: DateRange, trending?: boolean) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
    const { from, to } = this.getDefaultDateRange(range);

    // Recommendation → order conversion
    const recConditions: any[] = [
      gte(recommendations.recommendedAt, from),
      lte(recommendations.recommendedAt, to),
    ];
    const recStoreFilter = this.buildStoreFilter(isAdmin, storeIds, recommendations.storeId);
    if (recStoreFilter) recConditions.push(recStoreFilter);

    const [recTotal] = await this.db
      .select({ count: count() })
      .from(recommendations)
      .where(and(...recConditions));

    const [recConverted] = await this.db
      .select({ count: count() })
      .from(recommendations)
      .where(and(eq(recommendations.isConverted, true), ...recConditions));

    // Sample → order conversion
    const sampleConditions: any[] = [
      gte(samples.deliveredAt, from),
      lte(samples.deliveredAt, to),
    ];
    const sampleStoreFilter = this.buildStoreFilter(isAdmin, storeIds, samples.storeId);
    if (sampleStoreFilter) sampleConditions.push(sampleStoreFilter);

    const [sampleTotal] = await this.db
      .select({ count: count() })
      .from(samples)
      .where(and(...sampleConditions));

    const [sampleConverted] = await this.db
      .select({ count: count() })
      .from(samples)
      .where(and(eq(samples.isConverted, true), ...sampleConditions));

    const summary = {
      recommendationToSale: {
        total: recTotal?.count ?? 0,
        converted: recConverted?.count ?? 0,
        rate: recTotal?.count ? (recConverted?.count ?? 0) / recTotal.count : 0,
      },
      sampleToSale: {
        total: sampleTotal?.count ?? 0,
        converted: sampleConverted?.count ?? 0,
        rate: sampleTotal?.count ? (sampleConverted?.count ?? 0) / sampleTotal.count : 0,
      },
      period: { from, to },
    };

    if (!trending) return summary;

    // Monthly trend data
    const dateTrunc = sql`date_trunc('month', ${recommendations.recommendedAt})`;
    const trendRows = await this.db
      .select({
        period: dateTrunc.as("period"),
        total: count(),
        converted: sql<number>`COUNT(*) FILTER (WHERE ${recommendations.isConverted} = true)`,
      })
      .from(recommendations)
      .where(and(...recConditions))
      .groupBy(dateTrunc)
      .orderBy(dateTrunc);

    return {
      ...summary,
      trend: trendRows.map((r) => ({
        date: r.period,
        total: r.total,
        converted: r.converted,
        rate: r.total > 0 ? r.converted / r.total : 0,
      })),
    };
  }

  async getCustomerSegments(user: SessionUser) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
    const storeFilter = this.buildStoreFilter(isAdmin, storeIds, customers.signupStoreId);

    const conditions = storeFilter ? [storeFilter] : [];

    const result = await this.db
      .select({
        stage: customers.lifecycleStage,
        count: count(),
      })
      .from(customers)
      .where(conditions.length > 0 ? and(...conditions as any) : undefined)
      .groupBy(customers.lifecycleStage);

    return result.map((row) => ({
      segment: row.stage ?? "unknown",
      count: row.count,
    }));
  }

  async getAgendaReport(
    user: SessionUser,
    range?: DateRange,
    filters?: { staffUserId?: string; status?: string; page?: number; limit?: number },
  ) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
    const { from, to } = this.getDefaultDateRange(range);
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const offset = (page - 1) * limit;

    const conditions: any[] = [
      gte(appointments.startTime, from),
      lte(appointments.startTime, to),
    ];
    const storeFilter = this.buildStoreFilter(isAdmin, storeIds, appointments.storeId);
    if (storeFilter) conditions.push(storeFilter);
    if (filters?.staffUserId)
      conditions.push(eq(appointments.staffUserId, filters.staffUserId));
    if (filters?.status) conditions.push(eq(appointments.status, filters.status));

    const whereClause = and(...conditions);

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(appointments)
      .where(whereClause);

    const rows = await this.db
      .select({
        id: appointments.id,
        startTime: appointments.startTime,
        durationMinutes: appointments.durationMinutes,
        serviceTypeId: appointments.serviceTypeId,
        serviceTypeName: serviceTypes.displayName,
        status: appointments.status,
        notes: appointments.notes,
        isVirtual: appointments.isVirtual,
        customerName: sql<string>`${customers.firstName} || ' ' || ${customers.lastName}`,
        customerPhone: customers.phone,
        customerId: appointments.customerId,
        baName: users.fullName,
        staffUserId: appointments.staffUserId,
        storeName: stores.displayName,
        storeId: appointments.storeId,
      })
      .from(appointments)
      .innerJoin(customers, eq(appointments.customerId, customers.id))
      .innerJoin(users, eq(appointments.staffUserId, users.id))
      .innerJoin(stores, eq(appointments.storeId, stores.id))
      .leftJoin(serviceTypes, eq(appointments.serviceTypeId, serviceTypes.id))
      .where(whereClause)
      .orderBy(appointments.startTime)
      .limit(limit)
      .offset(offset);

    return {
      data: rows,
      total: totalResult?.count ?? 0,
      page,
      limit,
      period: { from, to },
    };
  }

  async getAppointmentsByBa(user: SessionUser, range?: DateRange) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
    const { from, to } = this.getDefaultDateRange(range);

    const conditions: any[] = [
      gte(appointments.startTime, from),
      lte(appointments.startTime, to),
    ];
    const storeFilter = this.buildStoreFilter(isAdmin, storeIds, appointments.storeId);
    if (storeFilter) conditions.push(storeFilter);

    const rows = await this.db
      .select({
        staffUserId: appointments.staffUserId,
        baName: users.fullName,
        total: count(),
        completed: sql<number>`COUNT(*) FILTER (WHERE ${appointments.status} = 'completed')`,
        scheduled: sql<number>`COUNT(*) FILTER (WHERE ${appointments.status} = 'scheduled')`,
        confirmed: sql<number>`COUNT(*) FILTER (WHERE ${appointments.status} = 'confirmed')`,
        cancelled: sql<number>`COUNT(*) FILTER (WHERE ${appointments.status} = 'cancelled')`,
        noShow: sql<number>`COUNT(*) FILTER (WHERE ${appointments.status} = 'no_show')`,
        rescheduled: sql<number>`COUNT(*) FILTER (WHERE ${appointments.status} = 'rescheduled')`,
      })
      .from(appointments)
      .innerJoin(users, eq(appointments.staffUserId, users.id))
      .where(and(...conditions))
      .groupBy(appointments.staffUserId, users.fullName);

    return {
      data: rows.map((r) => ({
        ...r,
        completionRate: r.total > 0 ? r.completed / r.total : 0,
        noShowRate: r.total > 0 ? r.noShow / r.total : 0,
        cancellationRate: r.total > 0 ? r.cancelled / r.total : 0,
      })),
      period: { from, to },
    };
  }

  async getRetention(user: SessionUser) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
    const storeFilter = this.buildStoreFilter(isAdmin, storeIds, customers.signupStoreId);
    const conditions: any[] = storeFilter ? [storeFilter] : [];

    const now = new Date();

    // Segment counts
    const stages = await this.db
      .select({ stage: customers.lifecycleStage, count: count() })
      .from(customers)
      .where(conditions.length > 0 ? and(...conditions as any) : undefined)
      .groupBy(customers.lifecycleStage);

    const stageMap: Record<string, number> = {};
    for (const s of stages) stageMap[s.stage] = s.count;

    const total = Object.values(stageMap).reduce((a, b) => a + b, 0);
    const atRiskCount = stageMap["at_risk"] ?? 0;

    // At-risk customer list (top 20)
    const atRiskConditions = [
      eq(customers.lifecycleStage, "at_risk"),
      ...(storeFilter ? [storeFilter] : []),
    ];
    const atRiskCustomers = await this.db
      .select({
        id: customers.id,
        name: sql<string>`${customers.firstName} || ' ' || ${customers.lastName}`,
        lastOrderAt: customers.lastOrderAt,
        lastInteractionAt: customers.lastInteractionAt,
        assignedToUserId: customers.assignedToUserId,
        baName: users.fullName,
      })
      .from(customers)
      .leftJoin(users, eq(customers.assignedToUserId, users.id))
      .where(and(...atRiskConditions as any))
      .orderBy(customers.lastOrderAt)
      .limit(20);

    return {
      stages: stageMap,
      total,
      churnRate: total > 0 ? atRiskCount / total : 0,
      atRiskCustomers: atRiskCustomers.map((c) => ({
        ...c,
        daysSinceLastOrder: c.lastOrderAt
          ? Math.floor((now.getTime() - new Date(c.lastOrderAt).getTime()) / 86400000)
          : null,
      })),
    };
  }

  async exportData(type: string, user: SessionUser, range?: DateRange) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
    const { from, to } = this.getDefaultDateRange(range);

    if (type === "customers") {
      const conditions: any[] = [];
      const storeFilter = this.buildStoreFilter(isAdmin, storeIds, customers.signupStoreId);
      if (storeFilter) conditions.push(storeFilter);
      return this.db
        .select()
        .from(customers)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
    }

    if (type === "sales") {
      const conditions: any[] = [gte(orders.processedAt, from), lte(orders.processedAt, to)];
      const storeFilter = this.buildStoreFilter(isAdmin, storeIds, orders.storeId);
      if (storeFilter) conditions.push(storeFilter);
      return this.db
        .select()
        .from(orders)
        .where(and(...conditions));
    }

    if (type === "appointments") {
      const conditions: any[] = [gte(appointments.startTime, from), lte(appointments.startTime, to)];
      const storeFilter = this.buildStoreFilter(isAdmin, storeIds, appointments.storeId);
      if (storeFilter) conditions.push(storeFilter);
      return this.db
        .select()
        .from(appointments)
        .where(and(...conditions));
    }

    return [];
  }

  // ─── Zone-level dashboards (area_manager / national_retail_manager) ──────

  /**
   * Aggregated multi-store dashboard for the Area / National Retail Manager.
   * Fans out the same KPIs as the counter dashboard but across every store
   * the user can see (scope resolved by ScopeService).
   */
  async getZoneOverview(user: SessionUser, range?: DateRange) {
    if (
      user.role !== UserRole.AREA_MANAGER &&
      user.role !== UserRole.NATIONAL_RETAIL_MANAGER &&
      user.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        "Zone overview is restricted to area_manager, national_retail_manager and admin",
      );
    }

    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === UserRole.ADMIN;
    const { from, to } = this.getDefaultDateRange(range);

    if (!isAdmin && storeIds.length === 0) {
      return {
        period: { from, to },
        scope: { storeCount: 0, storeIds: [] },
        sales: { totalAmount: 0, orderCount: 0, uniqueCustomers: 0 },
        customers: { total: 0, newInPeriod: 0 },
        appointments: { total: 0, completed: 0, noShow: 0 },
        recommendations: { total: 0, converted: 0, conversionPct: null },
        samples: { delivered: 0, converted: 0 },
        operations: { pendingApprovals: 0, stockAlerts: 0, upcomingEventsCount: 0 },
      };
    }

    const orderStoreFilter = this.buildStoreFilter(isAdmin, storeIds, orders.storeId);
    const customerStoreFilter = this.buildStoreFilter(
      isAdmin,
      storeIds,
      customers.signupStoreId,
    );
    const apptStoreFilter = this.buildStoreFilter(
      isAdmin,
      storeIds,
      appointments.storeId,
    );
    const recStoreFilter = this.buildStoreFilter(
      isAdmin,
      storeIds,
      recommendations.storeId,
    );
    const sampleStoreFilter = this.buildStoreFilter(
      isAdmin,
      storeIds,
      samples.storeId,
    );

    const orderConds: any[] = [
      gte(orders.processedAt, from),
      lte(orders.processedAt, to),
    ];
    if (orderStoreFilter) orderConds.push(orderStoreFilter);

    const [salesAgg] = await this.db
      .select({
        totalAmount: sql<string>`coalesce(sum(${orders.totalPrice}), 0)`,
        orderCount: count(),
        uniqueCustomers: sql<number>`count(distinct ${orders.customerId})::int`,
      })
      .from(orders)
      .where(and(...orderConds));

    const totalCustConds: any[] = customerStoreFilter ? [customerStoreFilter] : [];
    const [totalCust] = await this.db
      .select({ count: count() })
      .from(customers)
      .where(totalCustConds.length ? and(...totalCustConds) : undefined);

    const newCustConds: any[] = [
      gte(customers.enrolledAt, from),
      lte(customers.enrolledAt, to),
    ];
    if (customerStoreFilter) newCustConds.push(customerStoreFilter);
    const [newCust] = await this.db
      .select({ count: count() })
      .from(customers)
      .where(and(...newCustConds));

    const apptConds: any[] = [
      gte(appointments.startTime, from),
      lte(appointments.startTime, to),
    ];
    if (apptStoreFilter) apptConds.push(apptStoreFilter);
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
    if (recStoreFilter) recConds.push(recStoreFilter);
    const [recAgg] = await this.db
      .select({
        total: count(),
        converted: sql<number>`count(*) filter (where ${recommendations.isConverted} = true)::int`,
      })
      .from(recommendations)
      .where(and(...recConds));

    const sampleConds: any[] = [
      gte(samples.deliveredAt, from),
      lte(samples.deliveredAt, to),
    ];
    if (sampleStoreFilter) sampleConds.push(sampleStoreFilter);
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
        storeCount: isAdmin ? null : storeIds.length,
        storeIds: isAdmin ? null : storeIds,
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
   */
  async getStoresRanking(user: SessionUser, range?: DateRange) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === UserRole.ADMIN;
    const { from, to } = this.getDefaultDateRange(range);

    if (!isAdmin && storeIds.length === 0) {
      return { period: { from, to }, data: [] };
    }

    const storeFilter = this.buildStoreFilter(isAdmin, storeIds, orders.storeId);
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

    const custFilter = this.buildStoreFilter(isAdmin, storeIds, customers.signupStoreId);
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

    const recFilter = this.buildStoreFilter(isAdmin, storeIds, recommendations.storeId);
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
    let storeRows: { id: string; displayName: string; zoneId: string | null }[];
    if (isAdmin) {
      storeRows = await this.db
        .select({ id: stores.id, displayName: stores.displayName, zoneId: stores.zoneId })
        .from(stores);
    } else {
      storeRows = await this.db
        .select({ id: stores.id, displayName: stores.displayName, zoneId: stores.zoneId })
        .from(stores)
        .where(inArray(stores.id, storeIds));
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
   * Ranking of Counter Managers across the user's accessible stores.
   */
  async getCounterManagersRanking(user: SessionUser, range?: DateRange) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === UserRole.ADMIN;
    const { from, to } = this.getDefaultDateRange(range);

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

    const { from, to } = this.getDefaultDateRange(range);

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
    const { from, to } = this.getDefaultDateRange(range);

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
