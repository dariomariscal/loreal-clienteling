import { Injectable, Inject, ForbiddenException } from "@nestjs/common";
import { and, gte, lte, sql, count } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import { aiUsageLogs } from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../../common/types/session";
import { getDefaultDateRange, type DateRange } from "../shared/analytics-date.util";

/**
 * Cross-cutting AI telemetry for admin only. The RFP requires this view at the
 * country/IT level — it exposes PII-free usage metadata (tokens, cost, latency,
 * error rate) sliced by feature, provider, and model.
 */
@Injectable()
export class AiUsageAnalyticsService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async getOverview(user: SessionUser, range?: DateRange) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("AI usage analytics is admin-only");
    }
    const { from, to } = getDefaultDateRange(range);

    const baseConds = [
      gte(aiUsageLogs.createdAt, from),
      lte(aiUsageLogs.createdAt, to),
    ];

    const [totals] = await this.db
      .select({
        totalCalls: count(),
        totalCostUsd: sql<string>`coalesce(sum(${aiUsageLogs.costUsd}), 0)`,
        totalInputTokens: sql<number>`coalesce(sum(${aiUsageLogs.inputTokens}), 0)::int`,
        totalOutputTokens: sql<number>`coalesce(sum(${aiUsageLogs.outputTokens}), 0)::int`,
        totalCachedTokens: sql<number>`coalesce(sum(${aiUsageLogs.cachedTokens}), 0)::int`,
        errors: sql<number>`count(*) filter (where ${aiUsageLogs.status} <> 'success')::int`,
        p50LatencyMs: sql<number>`coalesce(percentile_cont(0.5) within group (order by ${aiUsageLogs.latencyMs}), 0)::int`,
        p95LatencyMs: sql<number>`coalesce(percentile_cont(0.95) within group (order by ${aiUsageLogs.latencyMs}), 0)::int`,
      })
      .from(aiUsageLogs)
      .where(and(...baseConds));

    const byFeature = await this.db
      .select({
        feature: aiUsageLogs.feature,
        calls: count(),
        costUsd: sql<string>`coalesce(sum(${aiUsageLogs.costUsd}), 0)`,
        errors: sql<number>`count(*) filter (where ${aiUsageLogs.status} <> 'success')::int`,
      })
      .from(aiUsageLogs)
      .where(and(...baseConds))
      .groupBy(aiUsageLogs.feature);

    const byProvider = await this.db
      .select({
        provider: aiUsageLogs.provider,
        model: aiUsageLogs.model,
        calls: count(),
        costUsd: sql<string>`coalesce(sum(${aiUsageLogs.costUsd}), 0)`,
        avgLatencyMs: sql<number>`coalesce(avg(${aiUsageLogs.latencyMs}), 0)::int`,
      })
      .from(aiUsageLogs)
      .where(and(...baseConds))
      .groupBy(aiUsageLogs.provider, aiUsageLogs.model);

    const totalCalls = totals?.totalCalls ?? 0;
    const errors = totals?.errors ?? 0;

    return {
      period: { from, to },
      totals: {
        calls: totalCalls,
        costUsd: Number(totals?.totalCostUsd ?? 0),
        inputTokens: totals?.totalInputTokens ?? 0,
        outputTokens: totals?.totalOutputTokens ?? 0,
        cachedTokens: totals?.totalCachedTokens ?? 0,
        errors,
        errorRatePct:
          totalCalls > 0 ? Math.round((errors / totalCalls) * 100) : 0,
        p50LatencyMs: totals?.p50LatencyMs ?? 0,
        p95LatencyMs: totals?.p95LatencyMs ?? 0,
      },
      byFeature: byFeature
        .map((r) => ({
          feature: r.feature,
          calls: r.calls,
          costUsd: Number(r.costUsd),
          errors: r.errors,
        }))
        .sort((a, b) => b.costUsd - a.costUsd),
      byProvider: byProvider
        .map((r) => ({
          provider: r.provider,
          model: r.model,
          calls: r.calls,
          costUsd: Number(r.costUsd),
          avgLatencyMs: r.avgLatencyMs,
        }))
        .sort((a, b) => b.costUsd - a.costUsd),
    };
  }
}
