import { Injectable, Inject, ForbiddenException } from "@nestjs/common";
import { eq, and, gte, lte, sql, count, sum } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import {
  customers,
  orders,
  recommendations,
  messages,
  users,
} from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../../common/types/session";
import { ScopeService } from "../../../common/services/scope.service";
import { getDefaultDateRange, type DateRange } from "../shared/analytics-date.util";

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
  async getBaSummary(user: SessionUser, range?: DateRange) {
    if (user.role === UserRole.BEAUTY_ADVISOR) {
      throw new ForbiddenException(
        "BA performance summary is restricted to counter_manager and above",
      );
    }
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === UserRole.ADMIN;
    const { from, to } = getDefaultDateRange(range);

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
}
