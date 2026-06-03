import type { ProductRecommendationCandidate } from "@loreal/contracts";

/**
 * One source of recommendation candidates. Implementations are stateless and
 * idempotent — given the same context, they must return the same candidates.
 *
 * Adding a new source (e.g. "trending_in_store" or "campaign_pushed") means:
 *   1. Implement this interface.
 *   2. Register the class in `RecommendationsModule` providers.
 *   3. Inject it into the engine's source list.
 * No existing source or the engine itself needs to change — Open/Closed.
 */
export interface RecommendationSignalSourceContext {
  customerId: string;
  storeId: string;
  brandId: string;
  excludeProductIds: string[];
  limit: number;
}

export interface RecommendationSignalSourceStrategy {
  readonly name: string;
  fetchCandidates(
    context: RecommendationSignalSourceContext,
  ): Promise<ProductRecommendationCandidate[]>;
}

export const RECOMMENDATION_SIGNAL_SOURCES_TOKEN =
  "RECOMMENDATION_SIGNAL_SOURCES";
