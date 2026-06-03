import { Injectable, Inject, ForbiddenException } from "@nestjs/common";
import { and, eq, gte, lte, sql, count, inArray } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import { baRatings, users } from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../../common/types/session";
import { ScopeService } from "../../../common/services/scope.service";
import { getDefaultDateRange, type DateRange } from "../shared/analytics-date.util";

/**
 * Per-BA NPS roll-up. Standard NPS = % promoters (9-10) - % detractors (0-6).
 * Returns one row per BA in scope plus an overall aggregate. Counter manager
 * and above only — BAs don't see peer ratings.
 */
@Injectable()
export class RatingsAnalyticsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  async getNpsByBa(user: SessionUser, range?: DateRange) {
    if (user.role === UserRole.BEAUTY_ADVISOR) {
      throw new ForbiddenException(
        "BA ratings are visible to counter_manager and above",
      );
    }

    const isAdmin = user.role === UserRole.ADMIN;
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const { from, to } = getDefaultDateRange(range);

    if (!isAdmin && storeIds.length === 0) {
      return { period: { from, to }, overall: null, data: [] };
    }

    const conds: any[] = [
      gte(baRatings.createdAt, from),
      lte(baRatings.createdAt, to),
    ];
    if (!isAdmin) conds.push(inArray(baRatings.storeId, storeIds));

    const rows = await this.db
      .select({
        baId: baRatings.reviewedUserId,
        baName: users.fullName,
        storeId: baRatings.storeId,
        total: count(),
        promoters: sql<number>`count(*) filter (where ${baRatings.score} >= 9)::int`,
        passives: sql<number>`count(*) filter (where ${baRatings.score} between 7 and 8)::int`,
        detractors: sql<number>`count(*) filter (where ${baRatings.score} <= 6)::int`,
        avgScore: sql<string>`avg(${baRatings.score})::text`,
      })
      .from(baRatings)
      .innerJoin(users, eq(baRatings.reviewedUserId, users.id))
      .where(and(...conds))
      .groupBy(baRatings.reviewedUserId, users.fullName, baRatings.storeId);

    const data = rows.map((r) => {
      const promoterPct = r.total > 0 ? (r.promoters / r.total) * 100 : 0;
      const detractorPct = r.total > 0 ? (r.detractors / r.total) * 100 : 0;
      return {
        baId: r.baId,
        baName: r.baName,
        storeId: r.storeId,
        total: r.total,
        promoters: r.promoters,
        passives: r.passives,
        detractors: r.detractors,
        avgScore: r.avgScore ? Number(Number(r.avgScore).toFixed(2)) : null,
        nps: Math.round(promoterPct - detractorPct),
      };
    });

    const totalAll = data.reduce((a, r) => a + r.total, 0);
    const promotersAll = data.reduce((a, r) => a + r.promoters, 0);
    const detractorsAll = data.reduce((a, r) => a + r.detractors, 0);
    const overall =
      totalAll > 0
        ? {
            total: totalAll,
            nps: Math.round(
              (promotersAll / totalAll) * 100 -
                (detractorsAll / totalAll) * 100,
            ),
          }
        : null;

    data.sort((a, b) => b.nps - a.nps);

    return { period: { from, to }, overall, data };
  }
}
