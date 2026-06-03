import { Injectable, Inject, ForbiddenException } from "@nestjs/common";
import { eq, and, gte, lte, sql, count, sum, inArray } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import {
  customers,
  orders,
  lineItems,
  recommendations,
  messages,
  products,
  suggestedActions,
  users,
} from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../../common/types/session";
import { ScopeService } from "../../../common/services/scope.service";
import { getDefaultDateRange } from "../shared/analytics-date.util";
import type { ReportFiltersInput } from "../shared/report-filters";
import { resolveScopedFilters } from "../shared/filter-resolution";

@Injectable()
export class PerformanceAnalyticsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  /**
   * Per-BA performance summary: sales attributed, customers registered,
   * messages sent, and recommendation conversion. Scoped to BAs reachable
   * by the caller.
   */
  async getBaSummary(user: SessionUser, filters?: ReportFiltersInput) {
    if (user.role === UserRole.BEAUTY_ADVISOR) {
      throw new ForbiddenException(
        "BA performance summary is restricted to counter_manager and above",
      );
    }
    const accessible = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === UserRole.ADMIN;
    const { from, to } = getDefaultDateRange(filters);

    const { storeIds, baUserId, brandId, emptyByBrandConflict } = await resolveScopedFilters(
      this.db,
      isAdmin,
      accessible,
      filters ?? {},
    );

    if ((storeIds != null && storeIds.length === 0) || emptyByBrandConflict) return [];

    // Get BAs accessible to this user, narrowed by filter scope.
    const baConditions: any[] = [
      eq(users.role, "beauty_advisor"),
      eq(users.isActive, true),
    ];
    if (storeIds != null) baConditions.push(inArray(users.storeId, storeIds));
    if (baUserId) baConditions.push(eq(users.id, baUserId));

    const bas = await this.db
      .select({ id: users.id, fullName: users.fullName, storeId: users.storeId })
      .from(users)
      .where(and(...baConditions));

    if (bas.length === 0) return [];

    const baIds = bas.map((b) => b.id);

    // Sales per BA — when brandId is set we sum line_items joined on products.
    const baseSalesConds: any[] = [
      inArray(orders.attributedUserId, baIds),
      gte(orders.processedAt, from),
      lte(orders.processedAt, to),
    ];
    if (storeIds != null) baseSalesConds.push(inArray(orders.storeId, storeIds));

    const salesRows = brandId
      ? await this.db
          .select({
            baId: orders.attributedUserId,
            totalAmount: sql<string>`coalesce(sum(${lineItems.price} * ${lineItems.quantity}), 0)`.mapWith(String),
            orderCount: sql<number>`count(distinct ${orders.id})::int`,
          })
          .from(orders)
          .innerJoin(lineItems, eq(lineItems.orderId, orders.id))
          .innerJoin(products, eq(products.id, lineItems.productId))
          .where(and(...baseSalesConds, eq(products.brandId, brandId)))
          .groupBy(orders.attributedUserId)
      : await this.db
          .select({
            baId: orders.attributedUserId,
            totalAmount: sum(orders.totalPrice),
            orderCount: count(),
          })
          .from(orders)
          .where(and(...baseSalesConds))
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

    // Follow-ups per BA — Tulip pattern: completed / completion-rate / overdue.
    const fuRows = await this.db
      .select({
        baId: suggestedActions.assignedToUserId,
        total: count(),
        completed: sql<number>`COUNT(*) FILTER (WHERE ${suggestedActions.completedAt} IS NOT NULL)`,
        dismissed: sql<number>`COUNT(*) FILTER (WHERE ${suggestedActions.dismissedAt} IS NOT NULL)`,
        overdue: sql<number>`COUNT(*) FILTER (WHERE ${suggestedActions.completedAt} IS NULL AND ${suggestedActions.dismissedAt} IS NULL AND ${suggestedActions.dueDate} < CURRENT_DATE)`,
      })
      .from(suggestedActions)
      .where(
        and(
          sql`${suggestedActions.assignedToUserId} IN (${sql.join(baIds.map((id) => sql`${id}`), sql`, `)})`,
          gte(suggestedActions.createdAt, from),
          lte(suggestedActions.createdAt, to),
        ),
      )
      .groupBy(suggestedActions.assignedToUserId);

    const fuMap = new Map(fuRows.map((r) => [r.baId, r]));

    return bas.map((ba) => {
      const sales = salesMap.get(ba.id);
      const recs = recMap.get(ba.id);
      const fu = fuMap.get(ba.id);
      const totalRecs = recs?.total ?? 0;
      const convertedRecs = recs?.converted ?? 0;
      const totalFu = fu?.total ?? 0;
      const completedFu = fu?.completed ?? 0;

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
        followUps: {
          total: totalFu,
          completed: completedFu,
          dismissed: fu?.dismissed ?? 0,
          overdue: fu?.overdue ?? 0,
          completionRate: totalFu > 0 ? completedFu / totalFu : 0,
        },
      };
    });
  }

  /**
   * Tulip "Follow-ups dashboard" — aggregated KPIs across the caller's scope.
   * Returns the 5-bucket status breakdown the BA / counter dashboard renders.
   */
  async getFollowUpKPIs(user: SessionUser, filters?: ReportFiltersInput) {
    const accessible = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === UserRole.ADMIN;
    const isBA = user.role === UserRole.BEAUTY_ADVISOR;
    const { from, to } = getDefaultDateRange(filters);

    const resolved = await resolveScopedFilters(this.db, isAdmin, accessible, filters ?? {});
    const { storeIds, baUserId, emptyByBrandConflict } = resolved;

    // Brand-vs-BA conflict (e.g. brandId=YSL with baUserId=Moy who is Lancôme)
    // means zero work to count for the selected combination.
    if (emptyByBrandConflict) {
      return {
        period: { from: from.toISOString(), to: to.toISOString() },
        total: 0,
        completed: 0,
        dismissed: 0,
        pending: 0,
        overdue: 0,
        dueToday: 0,
        completionRate: 0,
        byType: [] as { triggerType: string; count: number }[],
      };
    }

    const conditions: any[] = [
      gte(suggestedActions.createdAt, from),
      lte(suggestedActions.createdAt, to),
    ];

    if (isBA) {
      conditions.push(eq(suggestedActions.assignedToUserId, user.id));
    } else if (baUserId) {
      // Caller picked a specific BA — narrow directly by user id.
      conditions.push(eq(suggestedActions.assignedToUserId, baUserId));
    } else if (storeIds != null) {
      if (storeIds.length === 0) {
        // Empty scope: short-circuit with all zeros so we don't run the query
        // with an empty IN-list that PostgreSQL rejects.
        return {
          period: { from: from.toISOString(), to: to.toISOString() },
          total: 0,
          completed: 0,
          dismissed: 0,
          pending: 0,
          overdue: 0,
          dueToday: 0,
          completionRate: 0,
          byType: [] as { triggerType: string; count: number }[],
        };
      }
      conditions.push(
        sql`${suggestedActions.assignedToUserId} IN (
          SELECT ${users.id} FROM ${users}
          WHERE ${users.storeId} IN (${sql.join(storeIds.map((id) => sql`${id}`), sql`, `)})
        )`,
      );
    }

    const [row] = await this.db
      .select({
        total: count(),
        completed: sql<number>`COUNT(*) FILTER (WHERE ${suggestedActions.completedAt} IS NOT NULL)::int`,
        dismissed: sql<number>`COUNT(*) FILTER (WHERE ${suggestedActions.dismissedAt} IS NOT NULL)::int`,
        pending: sql<number>`COUNT(*) FILTER (WHERE ${suggestedActions.completedAt} IS NULL AND ${suggestedActions.dismissedAt} IS NULL)::int`,
        overdue: sql<number>`COUNT(*) FILTER (WHERE ${suggestedActions.completedAt} IS NULL AND ${suggestedActions.dismissedAt} IS NULL AND ${suggestedActions.dueDate} < CURRENT_DATE)::int`,
        dueToday: sql<number>`COUNT(*) FILTER (WHERE ${suggestedActions.completedAt} IS NULL AND ${suggestedActions.dismissedAt} IS NULL AND ${suggestedActions.dueDate} = CURRENT_DATE)::int`,
      })
      .from(suggestedActions)
      .where(and(...conditions));

    const total = row?.total ?? 0;
    const completed = row?.completed ?? 0;
    const completionRate = total > 0 ? completed / total : 0;

    // Breakdown by trigger type — used for the "Follow-up types" donut.
    const byType = await this.db
      .select({
        triggerType: suggestedActions.triggerType,
        count: count(),
      })
      .from(suggestedActions)
      .where(and(...conditions))
      .groupBy(suggestedActions.triggerType);

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      total,
      completed,
      dismissed: row?.dismissed ?? 0,
      pending: row?.pending ?? 0,
      overdue: row?.overdue ?? 0,
      dueToday: row?.dueToday ?? 0,
      completionRate: Math.round(completionRate * 100) / 100,
      byType: byType.map((r) => ({ triggerType: r.triggerType, count: r.count })),
    };
  }
}
