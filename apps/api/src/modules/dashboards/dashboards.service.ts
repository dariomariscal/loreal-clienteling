import { Injectable, Inject, ForbiddenException } from "@nestjs/common";
import { and, eq, gte, lte, sql, count, sum, inArray } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  customers,
  orders,
  recommendations,
  samples,
  appointments,
  approvalRequests,
  storeEvents,
  inventoryLevels,
  suggestedActions,
  users,
  stores,
} from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { SalesTargetsService } from "../sales-targets/sales-targets.service";
import { ShiftsService } from "../shifts/shifts.service";
import { AnalyticsService } from "../analytics/analytics.service";
import { BaRatingsService } from "../ba-ratings/ba-ratings.service";

@Injectable()
export class DashboardsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    @Inject(SalesTargetsService) private salesTargetsService: SalesTargetsService,
    @Inject(ShiftsService) private shiftsService: ShiftsService,
    @Inject(AnalyticsService) private analyticsService: AnalyticsService,
    @Inject(BaRatingsService) private baRatingsService: BaRatingsService,
  ) {}

  /**
   * Single-payload home screen for the Counter Manager. Fans out into the
   * specialized services in parallel so the client gets everything in one
   * round-trip. Scoped to the caller's storeId + brandId.
   */
  async getCounterToday(
    user: SessionUser,
    opts: { storeId?: string; brandId?: string; date?: string } = {},
  ) {
    const storeId = opts.storeId ?? user.storeId;
    const brandId = opts.brandId ?? user.brandId;
    const date = opts.date ?? new Date().toISOString().split("T")[0];

    if (!storeId) {
      throw new ForbiddenException(
        "Counter dashboard requires a storeId on the caller",
      );
    }

    if (user.role !== UserRole.ADMIN) {
      const accessibleStoreIds = await this.scopeService.getAccessibleStoreIds(user);
      if (!accessibleStoreIds.includes(storeId)) {
        throw new ForbiddenException("You do not have access to this store");
      }
    }

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const [
      targetProgress,
      todaySnapshot,
      apptBreakdown,
      sampleBreakdown,
      followUpBreakdown,
      pendingApprovals,
      upcomingEvents,
      stockAlertCount,
      roster,
      nps,
      baPerformance,
    ] = await Promise.all([
      brandId
        ? this.salesTargetsService.getTodayProgress(user, {
            date,
            storeId,
            brandId,
          })
        : Promise.resolve(null),
      this.getDaySnapshot(storeId, dayStart, dayEnd),
      this.getAppointmentBreakdown(storeId, dayStart, dayEnd),
      this.getSampleBreakdown(storeId, dayStart, dayEnd),
      this.getFollowUpBreakdown(storeId, dayStart, dayEnd),
      this.getPendingApprovalCount(storeId),
      this.getUpcomingEvents(storeId, dayStart),
      this.getStockAlertCount(storeId),
      this.shiftsService.getTodayRoster(user, { storeId }),
      this.baRatingsService.getNpsByBa(user, { storeId }),
      this.analyticsService.performance.getBaSummary(user, {
        from: dayStart,
        to: dayEnd,
      }),
    ]);

    const npsByUserId = new Map(nps.map((row) => [row.userId, row]));

    const baRanking = (baPerformance as Array<Record<string, unknown>>).map(
      (row) => {
        const userId = row.baId as string;
        const npsRow = npsByUserId.get(userId);
        return {
          ...row,
          nps: npsRow?.nps ?? null,
          npsResponseCount: npsRow?.responseCount ?? 0,
        };
      },
    );

    return {
      date,
      storeId,
      brandId,
      pulse: {
        target: targetProgress,
        ...todaySnapshot,
        appointments: apptBreakdown,
        samples: sampleBreakdown,
        followUps: followUpBreakdown,
      },
      team: {
        roster,
        ranking: baRanking,
      },
      operations: {
        pendingApprovalCount: pendingApprovals,
        upcomingEvents,
        stockAlertCount,
      },
    };
  }

  private async getDaySnapshot(
    storeId: string,
    from: Date,
    to: Date,
  ) {
    const [orderAgg] = await this.db
      .select({
        totalSales: sql<string>`coalesce(sum(${orders.totalPrice}), 0)`,
        orderCount: count(),
        uniqueCustomers: sql<number>`count(distinct ${orders.customerId})::int`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.storeId, storeId),
          gte(orders.processedAt, from),
          lte(orders.processedAt, to),
        ),
      );

    const [newCust] = await this.db
      .select({ count: count() })
      .from(customers)
      .where(
        and(
          eq(customers.signupStoreId, storeId),
          gte(customers.enrolledAt, from),
          lte(customers.enrolledAt, to),
        ),
      );

    const [recoAgg] = await this.db
      .select({
        total: count(),
        converted: sql<number>`count(*) filter (where ${recommendations.isConverted} = true)::int`,
      })
      .from(recommendations)
      .where(
        and(
          eq(recommendations.storeId, storeId),
          gte(recommendations.recommendedAt, from),
          lte(recommendations.recommendedAt, to),
        ),
      );

    const totalReco = recoAgg?.total ?? 0;
    const conversionPct =
      totalReco > 0
        ? Math.round(((recoAgg?.converted ?? 0) / totalReco) * 100)
        : null;

    return {
      totalSales: Number(orderAgg?.totalSales ?? 0),
      orderCount: orderAgg?.orderCount ?? 0,
      uniqueCustomers: orderAgg?.uniqueCustomers ?? 0,
      newRegistrations: newCust?.count ?? 0,
      recommendations: {
        total: totalReco,
        converted: recoAgg?.converted ?? 0,
        conversionPct,
      },
    };
  }

  private async getAppointmentBreakdown(
    storeId: string,
    from: Date,
    to: Date,
  ) {
    const rows = await this.db
      .select({
        status: appointments.status,
        count: count(),
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.storeId, storeId),
          gte(appointments.startTime, from),
          lte(appointments.startTime, to),
        ),
      )
      .groupBy(appointments.status);

    const map: Record<string, number> = {};
    for (const row of rows) map[row.status] = row.count;

    return {
      total: Object.values(map).reduce((a, b) => a + b, 0),
      scheduled: map["scheduled"] ?? 0,
      confirmed: map["confirmed"] ?? 0,
      completed: map["completed"] ?? 0,
      noShow: map["no_show"] ?? 0,
      cancelled: map["cancelled"] ?? 0,
    };
  }

  private async getSampleBreakdown(
    storeId: string,
    from: Date,
    to: Date,
  ) {
    const [agg] = await this.db
      .select({
        delivered: count(),
        converted: sql<number>`count(*) filter (where ${samples.isConverted} = true)::int`,
      })
      .from(samples)
      .where(
        and(
          eq(samples.storeId, storeId),
          gte(samples.deliveredAt, from),
          lte(samples.deliveredAt, to),
        ),
      );

    return {
      delivered: agg?.delivered ?? 0,
      converted: agg?.converted ?? 0,
    };
  }

  /**
   * Follow-ups completed today + still-open / overdue counts. Joins users so
   * we can scope to BAs in this store (suggested_actions has no storeId).
   */
  private async getFollowUpBreakdown(
    storeId: string,
    from: Date,
    to: Date,
  ) {
    const [completedRow] = await this.db
      .select({ count: count() })
      .from(suggestedActions)
      .innerJoin(users, eq(users.id, suggestedActions.assignedToUserId))
      .where(
        and(
          eq(users.storeId, storeId),
          gte(suggestedActions.completedAt, from),
          lte(suggestedActions.completedAt, to),
        ),
      );

    const [openRow] = await this.db
      .select({
        open: sql<number>`count(*) filter (where ${suggestedActions.completedAt} is null and ${suggestedActions.dismissedAt} is null)::int`,
        overdue: sql<number>`count(*) filter (where ${suggestedActions.completedAt} is null and ${suggestedActions.dismissedAt} is null and ${suggestedActions.dueDate} < current_date)::int`,
      })
      .from(suggestedActions)
      .innerJoin(users, eq(users.id, suggestedActions.assignedToUserId))
      .where(eq(users.storeId, storeId));

    return {
      completedToday: completedRow?.count ?? 0,
      open: openRow?.open ?? 0,
      overdue: openRow?.overdue ?? 0,
    };
  }

  private async getPendingApprovalCount(storeId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: count() })
      .from(approvalRequests)
      .where(
        and(
          eq(approvalRequests.storeId, storeId),
          eq(approvalRequests.status, "pending"),
        ),
      );
    return row?.count ?? 0;
  }

  private async getUpcomingEvents(storeId: string, after: Date) {
    return this.db
      .select({
        id: storeEvents.id,
        name: storeEvents.name,
        kind: storeEvents.kind,
        startTime: storeEvents.startTime,
        endTime: storeEvents.endTime,
        capacity: storeEvents.capacity,
        status: storeEvents.status,
      })
      .from(storeEvents)
      .where(
        and(
          eq(storeEvents.storeId, storeId),
          gte(storeEvents.startTime, after),
        ),
      )
      .orderBy(storeEvents.startTime)
      .limit(5);
  }

  private async getStockAlertCount(storeId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: count() })
      .from(inventoryLevels)
      .where(
        and(
          eq(inventoryLevels.storeId, storeId),
          sql`${inventoryLevels.stockStatus} in ('low', 'out_of_stock')`,
        ),
      );
    return row?.count ?? 0;
  }

  /**
   * Home dashboard for the Area / National Retail Manager. Bundles the
   * zone-wide KPIs (from AnalyticsService.getZoneOverview), the store
   * ranking, and the cross-store operational counters in a single payload
   * so the client only needs one request.
   */
  async getZoneToday(user: SessionUser, opts: { date?: string } = {}) {
    if (
      user.role !== UserRole.AREA_MANAGER &&
      user.role !== UserRole.NATIONAL_RETAIL_MANAGER &&
      user.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        "Zone dashboard is restricted to area_manager, national_retail_manager and admin",
      );
    }

    const date = opts.date ?? new Date().toISOString().split("T")[0];
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === UserRole.ADMIN;

    const [overview, ranking, operationalCounters, upcomingEvents] =
      await Promise.all([
        this.analyticsService.zoneManagement.getOverview(user, {
          from: dayStart,
          to: dayEnd,
        }),
        this.analyticsService.zoneManagement.getStoresRanking(user, {
          from: dayStart,
          to: dayEnd,
        }),
        this.getZoneOperationalCounters(isAdmin, storeIds),
        this.getZoneUpcomingEvents(isAdmin, storeIds, dayStart),
      ]);

    return {
      date,
      scope: {
        storeCount: isAdmin ? null : storeIds.length,
        storeIds: isAdmin ? null : storeIds,
      },
      pulse: overview,
      ranking: ranking.data,
      operations: {
        ...operationalCounters,
        upcomingEvents,
      },
    };
  }

  private async getZoneOperationalCounters(isAdmin: boolean, storeIds: string[]) {
    if (!isAdmin && storeIds.length === 0) {
      return { pendingApprovalCount: 0, stockAlertCount: 0 };
    }

    const approvalConds: any[] = [eq(approvalRequests.status, "pending")];
    if (!isAdmin) approvalConds.push(inArray(approvalRequests.storeId, storeIds));
    const [approvalRow] = await this.db
      .select({ count: count() })
      .from(approvalRequests)
      .where(and(...approvalConds));

    const stockConds: any[] = [
      sql`${inventoryLevels.stockStatus} in ('low', 'out_of_stock')`,
    ];
    if (!isAdmin) stockConds.push(inArray(inventoryLevels.storeId, storeIds));
    const [stockRow] = await this.db
      .select({ count: count() })
      .from(inventoryLevels)
      .where(and(...stockConds));

    return {
      pendingApprovalCount: approvalRow?.count ?? 0,
      stockAlertCount: stockRow?.count ?? 0,
    };
  }

  private async getZoneUpcomingEvents(
    isAdmin: boolean,
    storeIds: string[],
    after: Date,
  ) {
    if (!isAdmin && storeIds.length === 0) return [];

    const conds: any[] = [gte(storeEvents.startTime, after)];
    if (!isAdmin) conds.push(inArray(storeEvents.storeId, storeIds));

    return this.db
      .select({
        id: storeEvents.id,
        name: storeEvents.name,
        kind: storeEvents.kind,
        startTime: storeEvents.startTime,
        endTime: storeEvents.endTime,
        capacity: storeEvents.capacity,
        status: storeEvents.status,
        storeId: storeEvents.storeId,
        storeName: stores.displayName,
      })
      .from(storeEvents)
      .innerJoin(stores, eq(stores.id, storeEvents.storeId))
      .where(and(...conds))
      .orderBy(storeEvents.startTime)
      .limit(10);
  }
}
