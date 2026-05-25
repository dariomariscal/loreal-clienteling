import type { AttributionSource } from "@loreal/contracts";

export interface RecommendationRecord {
  recommendedByUserId: string;
  productId: string;
  recommendedAt: Date;
  recommendationId: string;
}

export interface AttributionInput {
  customerId: string;
  orderedProductIds: string[];
  processedAt: Date;
  assignedToUserId: string | null;
  lastInteractionAt: Date | null;
  activeRecommendations: RecommendationRecord[];
  now?: Date;
}

export interface AttributionResult {
  attributedUserId: string | null;
  attributionSource: AttributionSource | null;
  matchedRecommendationId: string | null;
}

const DAYS_MS = 24 * 60 * 60 * 1000;
const RECOMMENDATION_WINDOW_DAYS = 30;
const CONSULTATION_WINDOW_HOURS = 24;

/**
 * RF-25: Order attribution to an advisor.
 *
 * Rules, in priority order:
 * 1. If an active Recommendation (last 30 days) covers a purchased product →
 *    the advisor who recommended it.
 * 2. If there was a consultation (assignedToUserId) within the last 24 hours
 *    → that advisor.
 * 3. No attribution.
 */
export function attributePurchaseToBa(
  input: AttributionInput,
): AttributionResult {
  const now = input.now ?? new Date();
  const orderTime = input.processedAt;

  // Rule 1: Active recommendation within 30 days for one of the ordered products
  const windowStart = new Date(
    orderTime.getTime() - RECOMMENDATION_WINDOW_DAYS * DAYS_MS,
  );

  const matchingRecommendation = input.activeRecommendations
    .filter(
      (r) =>
        input.orderedProductIds.includes(r.productId) &&
        r.recommendedAt >= windowStart &&
        r.recommendedAt <= orderTime,
    )
    .sort((a, b) => b.recommendedAt.getTime() - a.recommendedAt.getTime())[0];

  if (matchingRecommendation) {
    return {
      attributedUserId: matchingRecommendation.recommendedByUserId,
      attributionSource: "active_recommendation",
      matchedRecommendationId: matchingRecommendation.recommendationId,
    };
  }

  // Rule 2: Last consultation within 24 hours
  if (input.assignedToUserId && input.lastInteractionAt) {
    const hoursSinceContact =
      (orderTime.getTime() - input.lastInteractionAt.getTime()) /
      (DAYS_MS / 24);

    if (
      hoursSinceContact >= 0 &&
      hoursSinceContact <= CONSULTATION_WINDOW_HOURS
    ) {
      return {
        attributedUserId: input.assignedToUserId,
        attributionSource: "last_consultation",
        matchedRecommendationId: null,
      };
    }
  }

  // Rule 3: No attribution
  void now;
  return {
    attributedUserId: null,
    attributionSource: null,
    matchedRecommendationId: null,
  };
}
