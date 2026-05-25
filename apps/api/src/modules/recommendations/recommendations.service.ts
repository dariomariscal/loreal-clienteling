import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, and, gte } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { recommendations } from "@loreal/database";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { AuditService } from "../../common/services/audit.service";
import type { CreateRecommendationDto } from "../../dtos/recommendations.dto";

@Injectable()
export class RecommendationsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    @Inject(AuditService) private auditService: AuditService,
  ) {}

  async findByCustomer(customerId: string, user: SessionUser) {
    const storeScope = await this.scopeService.scopeByStore(
      user,
      recommendations.storeId,
    );

    const conditions = [
      eq(recommendations.customerId, customerId),
      ...(storeScope ? [storeScope] : []),
    ];

    return this.db
      .select()
      .from(recommendations)
      .where(and(...conditions))
      .orderBy(recommendations.recommendedAt);
  }

  async create(data: CreateRecommendationDto, user: SessionUser) {
    const storeId = this.scopeService.assertStore(user);

    const [recommendation] = await this.db
      .insert(recommendations)
      .values({
        customerId: data.customerId,
        productId: data.productId,
        source: data.source,
        visitPurpose: data.visitPurpose,
        aiReasoning: data.aiReasoning,
        notes: data.notes,
        recommendedByUserId: user.id,
        storeId,
      })
      .returning();

    await this.auditService.log(
      user,
      "create",
      "recommendation",
      recommendation.id,
      { customerId: data.customerId, productId: data.productId, source: data.source },
    );

    return recommendation;
  }

  async markConverted(id: string, purchaseId: string) {
    const [updated] = await this.db
      .update(recommendations)
      .set({
        isConverted: true,
        convertedOrderId: purchaseId,
        updatedAt: new Date(),
      })
      .where(eq(recommendations.id, id))
      .returning();

    if (!updated) throw new NotFoundException("Recommendation not found");
    return updated;
  }

  async requestAiRecommendation(
    customerId: string,
    context: string | undefined,
    user: SessionUser,
  ) {
    // Placeholder: will be replaced in Phase 8 with actual AI service call
    return {
      status: "unavailable",
      message: "AI service not available yet",
      customerId,
    };
  }

  /**
   * Returns active (non-converted) recommendations for a customer within the last N days.
   * Used by PurchasesService for BA attribution.
   */
  async findActiveForCustomer(customerId: string, withinDays: number) {
    const since = new Date();
    since.setDate(since.getDate() - withinDays);

    return this.db
      .select()
      .from(recommendations)
      .where(
        and(
          eq(recommendations.customerId, customerId),
          eq(recommendations.isConverted, false),
          gte(recommendations.recommendedAt, since),
        ),
      );
  }
}
