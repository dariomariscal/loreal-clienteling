export const RecommendationSource = {
  MANUAL: "manual",
  AI_SUGGESTED: "ai_suggested",
  REPLENISHMENT_ALERT: "replenishment_alert",
  NEXT_BEST_ACTION: "next_best_action",
} as const;

export type RecommendationSource =
  (typeof RecommendationSource)[keyof typeof RecommendationSource];

export const RECOMMENDATION_SOURCES = Object.values(RecommendationSource);

/**
 * Reason a customer walked into the store / engaged the advisor. Drives
 * recommendation context.
 */
export const VisitPurpose = {
  NEW_PURCHASE: "new_purchase",
  REBUY: "rebuy",
  GIFT: "gift",
  CONCERN: "concern",
  PROMOTION: "promotion",
  BROWSING: "browsing",
} as const;

export type VisitPurpose = (typeof VisitPurpose)[keyof typeof VisitPurpose];

export const VISIT_PURPOSES = Object.values(VisitPurpose);
