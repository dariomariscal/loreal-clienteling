import { Injectable } from "@nestjs/common";
import type { ProductRecommendationCandidate } from "@loreal/contracts";
import { CustomerEmbeddingsRepository } from "../../ai/repositories/customer-embeddings.repository";
import { ProductEmbeddingsRepository } from "../../ai/repositories/product-embeddings.repository";
import type {
  RecommendationSignalSourceContext,
  RecommendationSignalSourceStrategy,
} from "./recommendation-signal-source";

/**
 * Customer-vector ↔ product-vector nearest neighbours. Highest-recall source;
 * gives broad coverage when the customer has minimal structured profile data.
 */
@Injectable()
export class SemanticMatchSource implements RecommendationSignalSourceStrategy {
  readonly name = "semantic_match";

  constructor(
    private readonly customerEmbeddings: CustomerEmbeddingsRepository,
    private readonly productEmbeddings: ProductEmbeddingsRepository,
  ) {}

  async fetchCandidates(
    context: RecommendationSignalSourceContext,
  ): Promise<ProductRecommendationCandidate[]> {
    const vector = await this.customerEmbeddings.findVectorByCustomerId(
      context.customerId,
    );
    if (!vector) return [];

    const hits = await this.productEmbeddings.searchInStockForStore(
      vector,
      context.storeId,
      context.brandId,
      context.limit * 2, // over-fetch so the ranker has room after dedup
    );

    const excluded = new Set(context.excludeProductIds);
    return hits
      .filter((h) => !excluded.has(h.productId))
      .slice(0, context.limit)
      .map((h) => ({
        productId: h.productId,
        source: "semantic_match" as const,
        score: clamp01(h.similarity),
      }));
  }
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
