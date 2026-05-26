import { Injectable, Inject } from "@nestjs/common";
import { eq, and, gte, lte, sql, count, sum } from "drizzle-orm";
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
} from "@loreal/database";
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
    const baConditions = [eq(users.role, "ba"), eq(users.isActive, true)];
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
}
