import { Injectable, Inject } from "@nestjs/common";
import { eq, and, gte, lte, sql, count, inArray } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import { recommendations, samples } from "@loreal/database";
import type { SessionUser } from "../../../common/types/session";
import { ScopeService } from "../../../common/services/scope.service";
import { getDefaultDateRange, type DateRange } from "../shared/analytics-date.util";
import { buildStoreScopeFilter } from "../shared/analytics-scope.util";

@Injectable()
export class RecommendationsAnalyticsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  async getConversionSummary(user: SessionUser, range?: DateRange, trending?: boolean) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
    const { from, to } = getDefaultDateRange(range);

    // Recommendation → order conversion
    const recConditions: any[] = [
      gte(recommendations.recommendedAt, from),
      lte(recommendations.recommendedAt, to),
    ];
    const recStoreFilter = buildStoreScopeFilter(isAdmin, storeIds, recommendations.storeId);
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
    const sampleStoreFilter = buildStoreScopeFilter(isAdmin, storeIds, samples.storeId);
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

  /**
   * Conversion broken down by `recommendations.source`. Lets the dashboard
   * answer "how do AI-suggested recommendations compare to manual ones?".
   * Returns one row per source actually present in the period so the UI
   * doesn't have to know the full enum.
   */
  async getConversionBySource(user: SessionUser, range?: DateRange) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
    const { from, to } = getDefaultDateRange(range);

    const conditions: any[] = [
      gte(recommendations.recommendedAt, from),
      lte(recommendations.recommendedAt, to),
    ];
    const storeFilter = buildStoreScopeFilter(
      isAdmin,
      storeIds,
      recommendations.storeId,
    );
    if (storeFilter) conditions.push(storeFilter);

    const rows = await this.db
      .select({
        source: recommendations.source,
        total: count(),
        converted: sql<number>`COUNT(*) FILTER (WHERE ${recommendations.isConverted} = true)::int`,
        avgEngineScore: sql<string | null>`AVG(${recommendations.engineScore})`,
      })
      .from(recommendations)
      .where(and(...conditions))
      .groupBy(recommendations.source);

    const data = rows.map((r) => ({
      source: r.source,
      total: r.total,
      converted: r.converted,
      conversionRate: r.total > 0 ? r.converted / r.total : 0,
      avgEngineScore:
        r.avgEngineScore !== null ? Number(r.avgEngineScore) : null,
    }));

    return {
      period: { from, to },
      data: data.sort((a, b) => b.total - a.total),
    };
  }

  /**
   * AI conversion summary scoped to a single customer. Powers the
   * AIConversionKpi tile on the customer profile. Returns the aggregate rate
   * for the last 90 days plus a 6-month monthly sparkline so the BA can see
   * trend at a glance without a separate request.
   */
  async getCustomerAiConversion(customerId: string, user: SessionUser) {
    await this.scopeService.assertCustomerAccess(customerId, user);

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    const aiSources = ["ai_suggested", "next_best_action", "replenishment_alert"];

    const [summary] = await this.db
      .select({
        total: count(),
        converted: sql<number>`COUNT(*) FILTER (WHERE ${recommendations.isConverted} = true)::int`,
      })
      .from(recommendations)
      .where(
        and(
          eq(recommendations.customerId, customerId),
          inArray(recommendations.source, aiSources),
          gte(recommendations.recommendedAt, ninetyDaysAgo),
        ),
      );

    // Previous 90d window for delta calculation.
    const previousStart = new Date(
      now.getTime() - 180 * 24 * 60 * 60 * 1000,
    );
    const [previousSummary] = await this.db
      .select({
        total: count(),
        converted: sql<number>`COUNT(*) FILTER (WHERE ${recommendations.isConverted} = true)::int`,
      })
      .from(recommendations)
      .where(
        and(
          eq(recommendations.customerId, customerId),
          inArray(recommendations.source, aiSources),
          gte(recommendations.recommendedAt, previousStart),
          lte(recommendations.recommendedAt, ninetyDaysAgo),
        ),
      );

    // 6-month sparkline.
    const dateTrunc = sql`date_trunc('month', ${recommendations.recommendedAt})`;
    const trendRows = await this.db
      .select({
        period: dateTrunc.as("period"),
        total: count(),
        converted: sql<number>`COUNT(*) FILTER (WHERE ${recommendations.isConverted} = true)::int`,
      })
      .from(recommendations)
      .where(
        and(
          eq(recommendations.customerId, customerId),
          inArray(recommendations.source, aiSources),
          gte(recommendations.recommendedAt, sixMonthsAgo),
        ),
      )
      .groupBy(dateTrunc)
      .orderBy(dateTrunc);

    const total = summary?.total ?? 0;
    const converted = summary?.converted ?? 0;
    const rate = total > 0 ? converted / total : 0;
    const previousRate =
      previousSummary && previousSummary.total > 0
        ? previousSummary.converted / previousSummary.total
        : null;
    const deltaPct =
      previousRate !== null
        ? Math.round((rate - previousRate) * 100)
        : null;

    return {
      rate,
      total,
      converted,
      deltaPct,
      trend: trendRows.map((r) => (r.total > 0 ? r.converted / r.total : 0)),
    };
  }
}
