import { Injectable, Inject } from "@nestjs/common";
import { eq, and, sql, count } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import { customers, users } from "@loreal/database";
import type { SessionUser } from "../../../common/types/session";
import { ScopeService } from "../../../common/services/scope.service";
import { buildStoreScopeFilter } from "../shared/analytics-scope.util";

@Injectable()
export class CustomersAnalyticsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  async getSegmentBreakdown(user: SessionUser) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
    const storeFilter = buildStoreScopeFilter(isAdmin, storeIds, customers.signupStoreId);

    const conditions = storeFilter ? [storeFilter] : [];

    const result = await this.db
      .select({
        stage: customers.lifecycleStage,
        count: count(),
      })
      .from(customers)
      .where(conditions.length > 0 ? and(...conditions as any) : undefined)
      .groupBy(customers.lifecycleStage);

    return result.map((row) => ({
      segment: row.stage ?? "unknown",
      count: row.count,
    }));
  }

  async getRetention(user: SessionUser) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
    const storeFilter = buildStoreScopeFilter(isAdmin, storeIds, customers.signupStoreId);
    const conditions: any[] = storeFilter ? [storeFilter] : [];

    const now = new Date();

    // Segment counts
    const stages = await this.db
      .select({ stage: customers.lifecycleStage, count: count() })
      .from(customers)
      .where(conditions.length > 0 ? and(...conditions as any) : undefined)
      .groupBy(customers.lifecycleStage);

    const stageMap: Record<string, number> = {};
    for (const s of stages) stageMap[s.stage] = s.count;

    const total = Object.values(stageMap).reduce((a, b) => a + b, 0);
    const atRiskCount = stageMap["at_risk"] ?? 0;

    // At-risk customer list (top 20)
    const atRiskConditions = [
      eq(customers.lifecycleStage, "at_risk"),
      ...(storeFilter ? [storeFilter] : []),
    ];
    const atRiskCustomers = await this.db
      .select({
        id: customers.id,
        name: sql<string>`${customers.firstName} || ' ' || ${customers.lastName}`,
        lastOrderAt: customers.lastOrderAt,
        lastInteractionAt: customers.lastInteractionAt,
        assignedToUserId: customers.assignedToUserId,
        baName: users.fullName,
      })
      .from(customers)
      .leftJoin(users, eq(customers.assignedToUserId, users.id))
      .where(and(...atRiskConditions as any))
      .orderBy(customers.lastOrderAt)
      .limit(20);

    return {
      stages: stageMap,
      total,
      churnRate: total > 0 ? atRiskCount / total : 0,
      atRiskCustomers: atRiskCustomers.map((c) => ({
        ...c,
        daysSinceLastOrder: c.lastOrderAt
          ? Math.floor((now.getTime() - new Date(c.lastOrderAt).getTime()) / 86400000)
          : null,
      })),
    };
  }
}
