import { Injectable, Inject, ForbiddenException } from "@nestjs/common";
import { and, eq, gte, lte, sql, count, inArray } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import {
  salesTargets,
  orders,
  lineItems,
  products,
  stores,
  brands,
  appointments,
  users,
} from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../../common/types/session";
import { ScopeService } from "../../../common/services/scope.service";
import { getDefaultDateRange, type DateRange } from "../shared/analytics-date.util";

/**
 * Target vs. actual per (storeId, brandId) for the period. Counter managers see
 * "venta del día vs objetivo" on home; area/national managers see how each
 * counter in scope is tracking. Actuals come from line_items joined to
 * products.brandId so we get true brand-level revenue (orders.totalPrice is
 * cross-brand at counter level when a store is multi-brand).
 */
@Injectable()
export class SalesTargetsAnalyticsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  async getTargetsVsActual(user: SessionUser, range?: DateRange) {
    if (user.role === UserRole.BEAUTY_ADVISOR) {
      throw new ForbiddenException(
        "Sales targets are visible to counter_manager and above",
      );
    }

    const isAdmin = user.role === UserRole.ADMIN;
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const { from, to } = getDefaultDateRange(range);

    if (!isAdmin && storeIds.length === 0) {
      return { period: { from, to }, data: [] };
    }

    const targetConds: any[] = [
      eq(salesTargets.ownerType, "counter"),
      eq(salesTargets.metricKind, "sales_amount"),
      gte(salesTargets.periodStart, from.toISOString().slice(0, 10)),
      lte(salesTargets.periodEnd, to.toISOString().slice(0, 10)),
    ];
    if (!isAdmin) targetConds.push(inArray(salesTargets.storeId, storeIds));

    const targetRows = await this.db
      .select({
        storeId: salesTargets.storeId,
        brandId: salesTargets.brandId,
        periodKind: salesTargets.periodKind,
        targetValue: sql<string>`coalesce(sum(${salesTargets.targetValue}), 0)`,
        currency: salesTargets.currency,
      })
      .from(salesTargets)
      .where(and(...targetConds))
      .groupBy(
        salesTargets.storeId,
        salesTargets.brandId,
        salesTargets.periodKind,
        salesTargets.currency,
      );

    const actualConds: any[] = [
      gte(orders.processedAt, from),
      lte(orders.processedAt, to),
    ];
    if (!isAdmin) actualConds.push(inArray(orders.storeId, storeIds));

    const actualRows = await this.db
      .select({
        storeId: orders.storeId,
        brandId: products.brandId,
        actualAmount: sql<string>`coalesce(sum(${lineItems.price}), 0)`,
        orderCount: sql<number>`count(distinct ${orders.id})::int`,
      })
      .from(lineItems)
      .innerJoin(orders, eq(lineItems.orderId, orders.id))
      .innerJoin(products, eq(lineItems.productId, products.id))
      .where(and(...actualConds))
      .groupBy(orders.storeId, products.brandId);

    const actualMap = new Map<string, { actualAmount: string; orderCount: number }>();
    for (const r of actualRows) {
      actualMap.set(`${r.storeId}:${r.brandId}`, {
        actualAmount: r.actualAmount,
        orderCount: r.orderCount,
      });
    }

    const storeRows = await this.db
      .select({ id: stores.id, displayName: stores.displayName })
      .from(stores);
    const storeNames = new Map(storeRows.map((s) => [s.id, s.displayName]));

    const brandRows = await this.db
      .select({ id: brands.id, displayName: brands.displayName })
      .from(brands);
    const brandNames = new Map(brandRows.map((b) => [b.id, b.displayName]));

    const data = targetRows.map((t) => {
      const actual = actualMap.get(`${t.storeId}:${t.brandId}`);
      const target = Number(t.targetValue);
      const actualAmount = Number(actual?.actualAmount ?? 0);
      const attainmentPct =
        target > 0 ? Math.round((actualAmount / target) * 100) : null;
      return {
        storeId: t.storeId,
        storeName: storeNames.get(t.storeId ?? "") ?? null,
        brandId: t.brandId,
        brandName: brandNames.get(t.brandId ?? "") ?? null,
        periodKind: t.periodKind,
        currency: t.currency,
        target,
        actual: actualAmount,
        gap: actualAmount - target,
        attainmentPct,
        orderCount: actual?.orderCount ?? 0,
      };
    });

    data.sort((a, b) => (b.attainmentPct ?? -1) - (a.attainmentPct ?? -1));

    return { period: { from, to }, data };
  }

  /**
   * Appointment targets vs actual — same Salesforce Goal pattern as the
   * sales-amount variant, but the actuals come from the appointments table
   * instead of orders. `metricKind` controls whether "actual" means booked
   * (any appointment created) or completed (status='completed').
   */
  async getAppointmentTargetsVsActual(
    user: SessionUser,
    range?: DateRange,
    metricKind: "appointments_booked" | "appointments_completed" = "appointments_booked",
  ) {
    if (user.role === UserRole.BEAUTY_ADVISOR) {
      // BA-level appointment targets are fine to read for the caller's own
      // user. Higher metrics require manager scope.
    }

    const isAdmin = user.role === UserRole.ADMIN;
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const { from, to } = getDefaultDateRange(range);

    if (!isAdmin && storeIds.length === 0) {
      return { period: { from, to }, metricKind, data: [] };
    }

    const targetConds: any[] = [
      eq(salesTargets.metricKind, metricKind),
      gte(salesTargets.periodStart, from.toISOString().slice(0, 10)),
      lte(salesTargets.periodEnd, to.toISOString().slice(0, 10)),
    ];
    if (!isAdmin) targetConds.push(inArray(salesTargets.storeId, storeIds));

    const targetRows = await this.db
      .select({
        id: salesTargets.id,
        ownerType: salesTargets.ownerType,
        storeId: salesTargets.storeId,
        ownerUserId: salesTargets.ownerUserId,
        periodKind: salesTargets.periodKind,
        periodStart: salesTargets.periodStart,
        periodEnd: salesTargets.periodEnd,
        targetValue: salesTargets.targetValue,
      })
      .from(salesTargets)
      .where(and(...targetConds));

    // Aggregate actuals — booked = createdAt in range; completed = startTime in range + status='completed'.
    const actualConds: any[] =
      metricKind === "appointments_booked"
        ? [gte(appointments.createdAt, from), lte(appointments.createdAt, to)]
        : [
            gte(appointments.startTime, from),
            lte(appointments.startTime, to),
            eq(appointments.status, "completed"),
          ];
    if (!isAdmin) actualConds.push(inArray(appointments.storeId, storeIds));

    const byStore = await this.db
      .select({
        storeId: appointments.storeId,
        count: sql<number>`count(*)::int`,
      })
      .from(appointments)
      .where(and(...actualConds))
      .groupBy(appointments.storeId);

    const byUser = await this.db
      .select({
        userId: appointments.staffUserId,
        count: sql<number>`count(*)::int`,
      })
      .from(appointments)
      .where(and(...actualConds))
      .groupBy(appointments.staffUserId);

    const storeNames = new Map(
      (await this.db.select({ id: stores.id, displayName: stores.displayName }).from(stores)).map(
        (s) => [s.id, s.displayName],
      ),
    );
    const userNames = new Map(
      (await this.db.select({ id: users.id, fullName: users.fullName }).from(users)).map((u) => [
        u.id,
        u.fullName,
      ]),
    );

    const storeMap = new Map(byStore.map((r) => [r.storeId, r.count]));
    const userMap = new Map(byUser.map((r) => [r.userId, r.count]));

    const data = targetRows.map((t) => {
      const actualCount =
        t.ownerType === "user" && t.ownerUserId
          ? userMap.get(t.ownerUserId) ?? 0
          : t.storeId
            ? storeMap.get(t.storeId) ?? 0
            : 0;
      const target = Number(t.targetValue);
      const attainmentPct = target > 0 ? Math.round((actualCount / target) * 100) : null;
      return {
        targetId: t.id,
        ownerType: t.ownerType,
        ownerName:
          t.ownerType === "user"
            ? userNames.get(t.ownerUserId ?? "") ?? null
            : storeNames.get(t.storeId ?? "") ?? null,
        storeId: t.storeId,
        ownerUserId: t.ownerUserId,
        periodKind: t.periodKind,
        periodStart: t.periodStart,
        periodEnd: t.periodEnd,
        target,
        actual: actualCount,
        gap: actualCount - target,
        attainmentPct,
      };
    });

    data.sort((a, b) => (b.attainmentPct ?? -1) - (a.attainmentPct ?? -1));

    return { period: { from, to }, metricKind, data };
  }
}
