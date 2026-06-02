import { Injectable, Inject } from "@nestjs/common";
import { eq, and, gte, lte, sql, count } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import {
  customers,
  orders,
  appointments,
  serviceTypes,
  users,
  stores,
} from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../../common/types/session";
import { ScopeService } from "../../../common/services/scope.service";
import { getDefaultDateRange, type DateRange } from "../shared/analytics-date.util";
import { buildStoreScopeFilter } from "../shared/analytics-scope.util";

@Injectable()
export class AppointmentsAnalyticsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  async getStatusBreakdown(user: SessionUser, range?: DateRange) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
    const { from, to } = getDefaultDateRange(range);

    const baseConditions = [gte(appointments.startTime, from), lte(appointments.startTime, to)];
    const storeFilter = buildStoreScopeFilter(isAdmin, storeIds, appointments.storeId);
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

  async getAgendaReport(
    user: SessionUser,
    range?: DateRange,
    filters?: { staffUserId?: string; status?: string; page?: number; limit?: number },
  ) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
    const { from, to } = getDefaultDateRange(range);
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const offset = (page - 1) * limit;

    const conditions: any[] = [
      gte(appointments.startTime, from),
      lte(appointments.startTime, to),
    ];
    const storeFilter = buildStoreScopeFilter(isAdmin, storeIds, appointments.storeId);
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

  async getByBa(user: SessionUser, range?: DateRange) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
    const { from, to } = getDefaultDateRange(range);

    const conditions: any[] = [
      gte(appointments.startTime, from),
      lte(appointments.startTime, to),
    ];
    const storeFilter = buildStoreScopeFilter(isAdmin, storeIds, appointments.storeId);
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

  /**
   * Composite "appointment overview" — KPIs + outcome / cancel / no-show
   * breakdowns + weekly trend + (for managers) per-BA ranking, all from one
   * round-trip.
   *
   * Role behaviour:
   *   - beauty_advisor : scoped to attributedUserId / staffUserId = self;
   *                      teamRanking returned as null.
   *   - counter_manager: scoped to BAs in their store; teamRanking populated.
   *   - area / national / admin: aggregated across accessible stores;
   *                      teamRanking populated.
   */
  async getOverview(user: SessionUser, range?: DateRange) {
    const isAdmin = user.role === UserRole.ADMIN;
    const isBA = user.role === UserRole.BEAUTY_ADVISOR;
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const { from, to } = getDefaultDateRange(range);

    const apptConditions = [
      gte(appointments.startTime, from),
      lte(appointments.startTime, to),
    ];
    if (isBA) {
      apptConditions.push(eq(appointments.staffUserId, user.id) as any);
    } else if (!isAdmin) {
      const storeFilter = buildStoreScopeFilter(
        false,
        storeIds,
        appointments.storeId,
      );
      if (storeFilter) apptConditions.push(storeFilter as any);
    }
    const apptWhere = and(...apptConditions);

    const orderConditions = [
      gte(orders.processedAt, from),
      lte(orders.processedAt, to),
      sql`${orders.appointmentId} IS NOT NULL` as any,
    ];
    if (isBA) {
      orderConditions.push(eq(orders.attributedUserId, user.id) as any);
    } else if (!isAdmin) {
      const storeFilter = buildStoreScopeFilter(
        false,
        storeIds,
        orders.storeId,
      );
      if (storeFilter) orderConditions.push(storeFilter as any);
    }
    const orderWhere = and(...orderConditions);

    const [
      statusRows,
      outcomeRows,
      cancelReasonRows,
      noShowReasonRows,
      revenueRow,
      trendRows,
    ] = await Promise.all([
      this.db
        .select({ status: appointments.status, count: count() })
        .from(appointments)
        .where(apptWhere)
        .groupBy(appointments.status),

      this.db
        .select({
          outcomeCode: appointments.outcomeCode,
          count: count(),
        })
        .from(appointments)
        .where(
          and(apptWhere, sql`${appointments.outcomeCode} IS NOT NULL`),
        )
        .groupBy(appointments.outcomeCode),

      this.db
        .select({
          reason: appointments.cancellationReason,
          count: count(),
        })
        .from(appointments)
        .where(
          and(
            apptWhere,
            eq(appointments.status, "cancelled"),
            sql`${appointments.cancellationReason} IS NOT NULL`,
          ),
        )
        .groupBy(appointments.cancellationReason),

      this.db
        .select({
          reason: appointments.noShowReason,
          count: count(),
        })
        .from(appointments)
        .where(
          and(
            apptWhere,
            eq(appointments.status, "no_show"),
            sql`${appointments.noShowReason} IS NOT NULL`,
          ),
        )
        .groupBy(appointments.noShowReason),

      this.db
        .select({
          totalRevenue: sql<string>`coalesce(sum(${orders.totalPrice}), 0)`,
          orderCount: count(),
        })
        .from(orders)
        .where(orderWhere),

      this.db
        .select({
          weekStart: sql<string>`to_char(date_trunc('week', ${appointments.startTime}), 'YYYY-MM-DD')`,
          total: count(),
          completed: sql<number>`sum(case when ${appointments.status} = 'completed' then 1 else 0 end)::int`,
        })
        .from(appointments)
        .where(apptWhere)
        .groupBy(sql`date_trunc('week', ${appointments.startTime})`)
        .orderBy(sql`date_trunc('week', ${appointments.startTime})`),
    ]);

    const statusMap: Record<string, number> = {};
    for (const r of statusRows) statusMap[r.status] = r.count;
    const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const completed = statusMap["completed"] ?? 0;
    const noShow = statusMap["no_show"] ?? 0;
    const cancelled = statusMap["cancelled"] ?? 0;
    const confirmed = statusMap["confirmed"] ?? 0;
    const scheduled = statusMap["scheduled"] ?? 0;
    const rescheduled = statusMap["rescheduled"] ?? 0;

    const arrivalDenom = completed + noShow;
    const showRatePct =
      arrivalDenom === 0 ? 0 : Math.round((completed / arrivalDenom) * 100);

    const salesClosed =
      outcomeRows.find((r) => r.outcomeCode === "sale_closed")?.count ?? 0;
    const conversionRatePct =
      completed === 0 ? 0 : Math.round((salesClosed / completed) * 100);

    const totalAppointmentRevenue = Number(revenueRow[0]?.totalRevenue ?? 0);
    const linkedOrderCount = revenueRow[0]?.orderCount ?? 0;
    const averageAppointmentValue =
      linkedOrderCount === 0
        ? 0
        : Math.round(totalAppointmentRevenue / linkedOrderCount);
    const revenuePerAppointment =
      completed === 0 ? 0 : Math.round(totalAppointmentRevenue / completed);

    const outcomeTotal = outcomeRows.reduce((a, r) => a + r.count, 0);
    const outcomes = outcomeRows
      .filter((r): r is { outcomeCode: string; count: number } =>
        r.outcomeCode !== null,
      )
      .map((r) => ({
        outcomeCode: r.outcomeCode as any,
        count: r.count,
        pct: outcomeTotal === 0 ? 0 : Math.round((r.count / outcomeTotal) * 100),
      }));

    const cancelTotal = cancelReasonRows.reduce((a, r) => a + r.count, 0);
    const cancellationReasons = cancelReasonRows
      .filter((r): r is { reason: string; count: number } => r.reason !== null)
      .map((r) => ({
        reason: r.reason as any,
        count: r.count,
        pct: cancelTotal === 0 ? 0 : Math.round((r.count / cancelTotal) * 100),
      }));

    const noShowTotal = noShowReasonRows.reduce((a, r) => a + r.count, 0);
    const noShowReasons = noShowReasonRows
      .filter((r): r is { reason: string; count: number } => r.reason !== null)
      .map((r) => ({
        reason: r.reason as any,
        count: r.count,
        pct:
          noShowTotal === 0 ? 0 : Math.round((r.count / noShowTotal) * 100),
      }));

    const revenueByWeek = await this.db
      .select({
        weekStart: sql<string>`to_char(date_trunc('week', ${appointments.startTime}), 'YYYY-MM-DD')`,
        revenue: sql<string>`coalesce(sum(${orders.totalPrice}), 0)`,
      })
      .from(appointments)
      .leftJoin(orders, eq(orders.appointmentId, appointments.id))
      .where(apptWhere)
      .groupBy(sql`date_trunc('week', ${appointments.startTime})`);

    const revenueMap = new Map(
      revenueByWeek.map((r) => [r.weekStart, Number(r.revenue)]),
    );

    const trend = trendRows.map((r) => ({
      weekStart: r.weekStart,
      total: r.total,
      completed: r.completed,
      revenue: revenueMap.get(r.weekStart) ?? 0,
    }));

    let teamRanking: Awaited<
      ReturnType<typeof this.computeTeamRanking>
    > | null = null;
    if (!isBA) {
      teamRanking = await this.computeTeamRanking(user, from, to, storeIds);
    }

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      kpis: {
        total,
        scheduled,
        confirmed,
        completed,
        cancelled,
        noShow,
        rescheduled,
        showRatePct,
        conversionRatePct,
        revenuePerAppointment,
        totalAppointmentRevenue,
        averageAppointmentValue,
      },
      outcomes,
      cancellationReasons,
      noShowReasons,
      trend,
      teamRanking,
    };
  }

  /**
   * Per-BA breakdown for managers. Returns one row per BA in the manager's
   * scope (or every active BA when admin) with their personal KPIs.
   */
  private async computeTeamRanking(
    user: SessionUser,
    from: Date,
    to: Date,
    storeIds: string[],
  ) {
    const isAdmin = user.role === UserRole.ADMIN;

    const baConditions = [
      eq(users.role, UserRole.BEAUTY_ADVISOR),
      eq(users.isActive, true),
    ];
    if (!isAdmin && storeIds.length > 0) {
      baConditions.push(
        sql`${users.storeId} IN (${sql.join(
          storeIds.map((id) => sql`${id}`),
          sql`, `,
        )})` as any,
      );
    }

    const bas = await this.db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(and(...baConditions));

    if (bas.length === 0) return [];
    const baIds = bas.map((b) => b.id);

    const apptByBa = await this.db
      .select({
        baId: appointments.staffUserId,
        total: count(),
        completed: sql<number>`sum(case when ${appointments.status} = 'completed' then 1 else 0 end)::int`,
        noShow: sql<number>`sum(case when ${appointments.status} = 'no_show' then 1 else 0 end)::int`,
        sales: sql<number>`sum(case when ${appointments.outcomeCode} = 'sale_closed' then 1 else 0 end)::int`,
      })
      .from(appointments)
      .where(
        and(
          sql`${appointments.staffUserId} IN (${sql.join(
            baIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
          gte(appointments.startTime, from),
          lte(appointments.startTime, to),
        ),
      )
      .groupBy(appointments.staffUserId);

    const apptMap = new Map(apptByBa.map((r) => [r.baId, r]));

    const revByBa = await this.db
      .select({
        baId: orders.attributedUserId,
        revenue: sql<string>`coalesce(sum(${orders.totalPrice}), 0)`,
        linkedOrders: count(),
      })
      .from(orders)
      .where(
        and(
          sql`${orders.attributedUserId} IN (${sql.join(
            baIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
          sql`${orders.appointmentId} IS NOT NULL`,
          gte(orders.processedAt, from),
          lte(orders.processedAt, to),
        ),
      )
      .groupBy(orders.attributedUserId);

    const revMap = new Map(revByBa.map((r) => [r.baId, r]));

    return bas
      .map((ba) => {
        const a = apptMap.get(ba.id);
        const r = revMap.get(ba.id);
        const total = a?.total ?? 0;
        const completed = a?.completed ?? 0;
        const noShow = a?.noShow ?? 0;
        const sales = a?.sales ?? 0;
        const arrivalDenom = completed + noShow;
        const revenue = Number(r?.revenue ?? 0);
        const linkedOrders = r?.linkedOrders ?? 0;
        return {
          userId: ba.id,
          fullName: ba.fullName,
          total,
          completed,
          showRatePct:
            arrivalDenom === 0
              ? 0
              : Math.round((completed / arrivalDenom) * 100),
          conversionRatePct:
            completed === 0 ? 0 : Math.round((sales / completed) * 100),
          revenue,
          averageAppointmentValue:
            linkedOrders === 0 ? 0 : Math.round(revenue / linkedOrders),
        };
      })
      .sort((x, y) => y.revenue - x.revenue);
  }
}
