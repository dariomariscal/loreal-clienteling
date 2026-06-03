import { Injectable, Inject } from "@nestjs/common";
import { and, eq, gte, lte, sql, count, inArray, isNull, isNotNull } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import {
  customers,
  suggestedActions,
  abandonedCarts,
} from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../../common/types/session";
import { ScopeService } from "../../../common/services/scope.service";

/**
 * Next-Best-Action pipeline view. Scoped by role:
 *   BA               → actions assigned to self
 *   counter / area / national → every open action whose customer's signup
 *                       store is in scope
 *   admin            → everything
 *
 * Splits by status (overdue / today / upcoming) and by triggerType so the
 * caller can render both a kanban-style summary and a per-trigger breakdown
 * without two round-trips. Includes the abandoned-cart pool separately
 * because it's not always materialized as a suggestedAction yet.
 */
@Injectable()
export class PipelineAnalyticsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  async getPipeline(user: SessionUser) {
    const isAdmin = user.role === UserRole.ADMIN;
    const isBA = user.role === UserRole.BEAUTY_ADVISOR;
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString().slice(0, 10);

    // Suggested actions still open (not dismissed, not completed, not expired).
    const openConds = [
      isNull(suggestedActions.completedAt),
      isNull(suggestedActions.dismissedAt),
      sql`(${suggestedActions.expiresAt} IS NULL OR ${suggestedActions.expiresAt} > now())`,
    ];

    if (isBA) {
      openConds.push(eq(suggestedActions.assignedToUserId, user.id) as any);
    } else if (!isAdmin) {
      if (storeIds.length === 0) {
        return this.emptyResponse();
      }
      // Manager-tier: scope through the customer's signup store.
      openConds.push(inArray(customers.signupStoreId, storeIds) as any);
    }

    const needsCustomerJoin = !isBA && !isAdmin;

    const buckets = needsCustomerJoin
      ? await this.db
          .select({
            triggerType: suggestedActions.triggerType,
            overdue: sql<number>`count(*) filter (where ${suggestedActions.dueDate} < ${todayIso})::int`,
            today: sql<number>`count(*) filter (where ${suggestedActions.dueDate} = ${todayIso})::int`,
            upcoming: sql<number>`count(*) filter (where ${suggestedActions.dueDate} > ${todayIso})::int`,
            total: count(),
          })
          .from(suggestedActions)
          .innerJoin(customers, eq(customers.id, suggestedActions.customerId))
          .where(and(...openConds))
          .groupBy(suggestedActions.triggerType)
      : await this.db
          .select({
            triggerType: suggestedActions.triggerType,
            overdue: sql<number>`count(*) filter (where ${suggestedActions.dueDate} < ${todayIso})::int`,
            today: sql<number>`count(*) filter (where ${suggestedActions.dueDate} = ${todayIso})::int`,
            upcoming: sql<number>`count(*) filter (where ${suggestedActions.dueDate} > ${todayIso})::int`,
            total: count(),
          })
          .from(suggestedActions)
          .where(and(...openConds))
          .groupBy(suggestedActions.triggerType);

    // Abandoned carts still unrecovered. No advisor assignment; for BA we
    // can't filter to "mine" (the schema doesn't track ownership), so we
    // hide it for BAs and surface it only to managers as a pool stat.
    let abandoned: { open: number; totalValue: number } | null = null;
    if (!isBA) {
      const cartConds = [isNull(abandonedCarts.recoveredOrderId)];
      if (!isAdmin) {
        cartConds.push(inArray(customers.signupStoreId, storeIds) as any);
      }

      const [agg] = isAdmin
        ? await this.db
            .select({
              open: count(),
              totalValue: sql<string>`coalesce(sum(${abandonedCarts.totalValue}), 0)`,
            })
            .from(abandonedCarts)
            .where(and(...cartConds))
        : await this.db
            .select({
              open: count(),
              totalValue: sql<string>`coalesce(sum(${abandonedCarts.totalValue}), 0)`,
            })
            .from(abandonedCarts)
            .innerJoin(customers, eq(customers.id, abandonedCarts.customerId))
            .where(and(...cartConds));

      abandoned = {
        open: agg?.open ?? 0,
        totalValue: Number(agg?.totalValue ?? 0),
      };

      // Also include recovered carts in the period — useful as a "wins"
      // counter at the top of the pipeline view.
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recoveredConds = [
        isNotNull(abandonedCarts.recoveredOrderId),
        gte(abandonedCarts.recoveredAt, since),
      ];
      if (!isAdmin) {
        recoveredConds.push(inArray(customers.signupStoreId, storeIds) as any);
      }
      const [recovered] = isAdmin
        ? await this.db
            .select({
              recovered: count(),
              recoveredValue: sql<string>`coalesce(sum(${abandonedCarts.totalValue}), 0)`,
            })
            .from(abandonedCarts)
            .where(and(...recoveredConds))
        : await this.db
            .select({
              recovered: count(),
              recoveredValue: sql<string>`coalesce(sum(${abandonedCarts.totalValue}), 0)`,
            })
            .from(abandonedCarts)
            .innerJoin(customers, eq(customers.id, abandonedCarts.customerId))
            .where(and(...recoveredConds));

      abandoned = {
        ...abandoned,
        ...{
          recoveredLast30d: recovered?.recovered ?? 0,
          recoveredValueLast30d: Number(recovered?.recoveredValue ?? 0),
        },
      } as any;
    }

    const totals = buckets.reduce(
      (acc, b) => {
        acc.overdue += b.overdue;
        acc.today += b.today;
        acc.upcoming += b.upcoming;
        acc.total += b.total;
        return acc;
      },
      { overdue: 0, today: 0, upcoming: 0, total: 0 },
    );

    return {
      scope: {
        role: user.role,
        viewMode: isBA ? "personal" : isAdmin ? "global" : "store_scope",
        storeIds: isAdmin ? null : storeIds,
      },
      totals,
      byTriggerType: buckets.sort((a, b) => b.total - a.total),
      abandonedCarts: abandoned,
    };
  }

  private emptyResponse() {
    return {
      scope: { role: null, viewMode: "store_scope" as const, storeIds: [] },
      totals: { overdue: 0, today: 0, upcoming: 0, total: 0 },
      byTriggerType: [],
      abandonedCarts: null,
    };
  }
}
