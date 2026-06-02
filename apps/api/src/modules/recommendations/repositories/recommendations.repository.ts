import { Injectable, Inject } from "@nestjs/common";
import { eq, and, inArray, gt, desc, isNull } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import {
  recommendations,
  products,
  brands,
  inventoryLevels,
  orders,
  lineItems,
} from "@loreal/database";
import type {
  ProductRankingMetadata,
  RecommendationReasonSignals,
  RecommendationSource,
} from "@loreal/contracts";

export interface InsertEngineRecommendationInput {
  customerId: string;
  productId: string;
  recommendedByUserId: string;
  storeId: string;
  source: RecommendationSource;
  aiReasoning: string | null;
  reasonSignals: RecommendationReasonSignals;
  engineScore: number;
}

/**
 * Persistence boundary for the `recommendations` table. The engine and the
 * manual-flow service both write here so the schema is touched in exactly
 * one place (DRY + SRP). Read-side queries that need product metadata for the
 * ranker also live here so the orchestrator stays Drizzle-agnostic.
 */
@Injectable()
export class RecommendationsRepository {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async insertManyFromEngine(
    rows: InsertEngineRecommendationInput[],
  ): Promise<void> {
    if (rows.length === 0) return;
    await this.db.insert(recommendations).values(
      rows.map((r) => ({
        customerId: r.customerId,
        productId: r.productId,
        recommendedByUserId: r.recommendedByUserId,
        storeId: r.storeId,
        source: r.source,
        aiReasoning: r.aiReasoning,
        reasonSignals: r.reasonSignals,
        engineScore: r.engineScore.toFixed(3),
      })),
    );
  }

  /**
   * Catalog metadata for a set of products + stock flag for the given store.
   * Returned shape matches the pure ranker's expected input so the
   * orchestrator can hand it over directly.
   */
  async findRankingMetadata(
    productIds: string[],
    storeId: string,
  ): Promise<Record<string, ProductRankingMetadata>> {
    if (productIds.length === 0) return {};

    const rows = await this.db
      .select({
        productId: products.id,
        brandId: products.brandId,
        category: products.category,
        productType: products.productType,
        price: products.price,
        ingredients: products.ingredients,
        targetConcerns: products.targetConcerns,
        tags: products.tags,
        storeStock: inventoryLevels.availableQuantity,
      })
      .from(products)
      .leftJoin(
        inventoryLevels,
        and(
          eq(inventoryLevels.productId, products.id),
          eq(inventoryLevels.storeId, storeId),
        ),
      )
      .where(
        and(
          inArray(products.id, productIds),
          eq(products.status, "active"),
        ),
      );

    const index: Record<string, ProductRankingMetadata> = {};
    for (const r of rows) {
      // A product with multiple variants may yield multiple rows; we keep
      // the first one and OR the stock flag.
      const prior = index[r.productId];
      const hasStock = (r.storeStock ?? 0) > 0 || Boolean(prior?.hasStock);
      index[r.productId] = {
        productId: r.productId,
        brandId: r.brandId,
        category: r.category,
        productType: r.productType,
        price: Number(r.price),
        ingredients: r.ingredients ?? [],
        targetConcerns: r.targetConcerns ?? [],
        tags: r.tags ?? [],
        hasStock,
      };
    }
    return index;
  }

  /**
   * Display metadata for surfacing the ranked list in the UI. Pulled
   * separately from `findRankingMetadata` because the ranker doesn't need
   * the human-readable fields (title, SKU, brand name, image) and we want
   * the ranker pipeline to stay narrow.
   */
  async findDisplayMetadata(
    productIds: string[],
  ): Promise<
    Record<
      string,
      {
        productId: string;
        sku: string;
        title: string;
        brandName: string | null;
        price: string;
        images: string[];
      }
    >
  > {
    if (productIds.length === 0) return {};
    const rows = await this.db
      .select({
        productId: products.id,
        sku: products.sku,
        title: products.title,
        brandName: brands.displayName,
        price: products.price,
        images: products.images,
      })
      .from(products)
      .leftJoin(brands, eq(brands.id, products.brandId))
      .where(inArray(products.id, productIds));

    return Object.fromEntries(
      rows.map((r) => [
        r.productId,
        {
          productId: r.productId,
          sku: r.sku,
          title: r.title,
          brandName: r.brandName,
          price: r.price,
          images: r.images ?? [],
        },
      ]),
    );
  }

  /**
   * Currently-active (non-converted, non-stale) engine-produced
   * recommendations for a customer. Used by the read endpoint.
   */
  async listActiveForCustomer(customerId: string, withinDays: number) {
    const since = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000);
    return this.db
      .select()
      .from(recommendations)
      .where(
        and(
          eq(recommendations.customerId, customerId),
          eq(recommendations.isConverted, false),
          gt(recommendations.recommendedAt, since),
          isNull(recommendations.notes),
        ),
      )
      .orderBy(desc(recommendations.recommendedAt));
  }

  /**
   * Products the customer already bought, used as the engine's exclusion set
   * so we never recommend something she already owns.
   */
  async findPurchasedProductIds(customerId: string): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ productId: lineItems.productId })
      .from(lineItems)
      .innerJoin(orders, eq(orders.id, lineItems.orderId))
      .where(eq(orders.customerId, customerId));
    return rows.map((r) => r.productId);
  }
}
