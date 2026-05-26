import { Injectable, Inject, ForbiddenException } from "@nestjs/common";
import { and, eq, gte, lte, sql, count, sum } from "drizzle-orm";
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
  users,
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
      this.getPendingApprovalCount(storeId),
      this.getUpcomingEvents(storeId, dayStart),
      this.getStockAlertCount(storeId),
      this.shiftsService.getTodayRoster(user, { storeId }),
      this.baRatingsService.getNpsByBa(user, { storeId }),
      this.analyticsService.getBaPerformance(user, {
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
}
