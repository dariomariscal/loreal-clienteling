import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, and, gte, desc } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { recommendations, products, brands } from "@loreal/database";
import type { RecommendationListItem } from "@loreal/contracts";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { AuditService } from "../../common/services/audit.service";
import { CustomerActivityService } from "../../common/services/customer-activity.service";
import type { CreateRecommendationDto } from "../../dtos/recommendations.dto";

@Injectable()
export class RecommendationsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    @Inject(AuditService) private auditService: AuditService,
    @Inject(CustomerActivityService)
    private customerActivity: CustomerActivityService,
  ) {}

  async findByCustomer(
    customerId: string,
    user: SessionUser,
  ): Promise<RecommendationListItem[]> {
    const storeScope = await this.scopeService.scopeByStore(
      user,
      recommendations.storeId,
    );

    const conditions = [
      eq(recommendations.customerId, customerId),
      ...(storeScope ? [storeScope] : []),
    ];

    const rows = await this.db
      .select({
        id: recommendations.id,
        customerId: recommendations.customerId,
        productId: recommendations.productId,
        recommendedByUserId: recommendations.recommendedByUserId,
        storeId: recommendations.storeId,
        recommendedAt: recommendations.recommendedAt,
        source: recommendations.source,
        aiReasoning: recommendations.aiReasoning,
        reasonSignals: recommendations.reasonSignals,
        engineScore: recommendations.engineScore,
        notes: recommendations.notes,
        visitPurpose: recommendations.visitPurpose,
        isConverted: recommendations.isConverted,
        convertedOrderId: recommendations.convertedOrderId,
        productSku: products.sku,
        productTitle: products.title,
        productPrice: products.price,
        productImages: products.images,
        brandName: brands.displayName,
      })
      .from(recommendations)
      .leftJoin(products, eq(products.id, recommendations.productId))
      .leftJoin(brands, eq(brands.id, products.brandId))
      .where(and(...conditions))
      .orderBy(desc(recommendations.recommendedAt));

    return rows.map((r) => ({
      id: r.id,
      customerId: r.customerId,
      productId: r.productId,
      recommendedByUserId: r.recommendedByUserId,
      storeId: r.storeId,
      recommendedAt: r.recommendedAt.toISOString(),
      source: r.source,
      aiReasoning: r.aiReasoning,
      notes: r.notes,
      visitPurpose: r.visitPurpose,
      isConverted: r.isConverted,
      convertedOrderId: r.convertedOrderId,
      reasonSignals: r.reasonSignals ?? null,
      engineScore: r.engineScore !== null ? Number(r.engineScore) : null,
      product: r.productSku
        ? {
            id: r.productId,
            sku: r.productSku,
            title: r.productTitle ?? "",
            brandName: r.brandName,
            price: r.productPrice ?? "0",
            images: r.productImages ?? [],
          }
        : null,
    }));
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

    await this.customerActivity.touchInteraction(data.customerId);

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
