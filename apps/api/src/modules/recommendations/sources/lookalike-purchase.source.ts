import { Injectable } from "@nestjs/common";
import type { ProductRecommendationCandidate } from "@loreal/contracts";
import { CustomerEmbeddingsRepository } from "../../ai/repositories/customer-embeddings.repository";
import type {
  RecommendationSignalSourceContext,
  RecommendationSignalSourceStrategy,
} from "./recommendation-signal-source";

const LOOKALIKE_POOL_SIZE = 50;

/**
 * Collaborative-filtering style source: find customers whose embedding is
 * close to the seed customer's, aggregate what they bought, surface the
 * top products the seed customer hasn't bought yet.
 *
 * Stays simple on purpose — no matrix factorisation, no item2vec — because
 * the embedding similarity already encodes preference, and pgvector + a
 * GROUP BY is cheap enough at our scale.
 */
@Injectable()
export class LookalikePurchaseSource
  implements RecommendationSignalSourceStrategy
{
  readonly name = "lookalike_purchase";

  constructor(
    private readonly customerEmbeddings: CustomerEmbeddingsRepository,
  ) {}

  async fetchCandidates(
    context: RecommendationSignalSourceContext,
  ): Promise<ProductRecommendationCandidate[]> {
    const lookalikes = await this.customerEmbeddings.findLookalikeCustomerIds(
      context.customerId,
      LOOKALIKE_POOL_SIZE,
    );
    if (lookalikes.length === 0) return [];

    const aggregated = await this.customerEmbeddings.aggregateLookalikePurchases({
      lookalikeCustomerIds: lookalikes.map((l) => l.customerId),
      excludeProductIds: context.excludeProductIds,
      storeId: context.storeId,
      brandId: context.brandId,
      limit: context.limit,
    });

    if (aggregated.length === 0) return [];

    const maxCount = aggregated[0].purchaseCount;
    return aggregated.map((a) => ({
      productId: a.productId,
      source: "lookalike_purchase" as const,
      score: maxCount === 0 ? 0 : a.purchaseCount / maxCount,
    }));
  }
}
