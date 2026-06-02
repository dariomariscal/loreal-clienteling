import { Injectable, Inject } from "@nestjs/common";
import { and, eq, gte, lte, count, sum } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  customers,
  orders,
  appointments,
  messages,
} from "@loreal/database";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { AppointmentsAnalyticsService } from "./appointments/appointments-analytics.service";
import { SalesAnalyticsService } from "./sales/sales-analytics.service";
import { CustomersAnalyticsService } from "./customers/customers-analytics.service";
import { RecommendationsAnalyticsService } from "./recommendations/recommendations-analytics.service";
import { PerformanceAnalyticsService } from "./performance/performance-analytics.service";
import { ZoneAnalyticsService } from "./zone-management/zone-analytics.service";
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
  ) {}

  /**
   * Cross-domain home dashboard: totals customers + sales + appointments +
   * new customers + messages, all scoped to the caller. Lives on the facade
   * because it spans every domain.
   */
  async getDashboard(user: SessionUser, range?: DateRange) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
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

  /**
   * Cross-domain raw export: returns scoped rows of customers / sales /
   * appointments. Used by the /analytics/export endpoint for CSV / XLSX
   * downloads. Lives on the facade because it pivots across domains by
   * the `type` parameter rather than belonging to a single one.
   */
  async exportData(type: string, user: SessionUser, range?: DateRange) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
    const { from, to } = getDefaultDateRange(range);

    if (type === "customers") {
      const conditions: any[] = [];
      const storeFilter = buildStoreScopeFilter(isAdmin, storeIds, customers.signupStoreId);
      if (storeFilter) conditions.push(storeFilter);
      return this.db
        .select()
        .from(customers)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
    }

    if (type === "sales") {
      const conditions: any[] = [gte(orders.processedAt, from), lte(orders.processedAt, to)];
      const storeFilter = buildStoreScopeFilter(isAdmin, storeIds, orders.storeId);
      if (storeFilter) conditions.push(storeFilter);
      return this.db
        .select()
        .from(orders)
        .where(and(...conditions));
    }

    if (type === "appointments") {
      const conditions: any[] = [gte(appointments.startTime, from), lte(appointments.startTime, to)];
      const storeFilter = buildStoreScopeFilter(isAdmin, storeIds, appointments.storeId);
      if (storeFilter) conditions.push(storeFilter);
      return this.db
        .select()
        .from(appointments)
        .where(and(...conditions));
    }

    return [];
  }
}
