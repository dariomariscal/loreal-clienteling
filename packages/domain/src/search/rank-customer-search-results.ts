import type { LifecycleStage } from "@loreal/contracts";

export interface CustomerSearchRecord {
  customerId: string;
  firstName: string;
  lastName: string;
  lastInteractionAt: Date | null;
  lastOrderAt: Date | null;
  assignedToUserId: string | null;
  lifecycleStage: LifecycleStage;
  textMatchScore: number;
}

export interface SearchRankingInput {
  results: CustomerSearchRecord[];
  searchingUserId: string;
  now?: Date;
}

export interface RankedSearchResult {
  customer: CustomerSearchRecord;
  finalScore: number;
}

const DAYS_MS = 24 * 60 * 60 * 1000;

// Lifecycle-stage value weights: VIPs and at-risk customers surface higher
const STAGE_WEIGHTS: Record<LifecycleStage, number> = {
  vip: 20,
  at_risk: 15,
  returning: 10,
  new: 5,
  dormant: 8,
};

/**
 * RF-03: Customer search result ranking.
 *
 * Composite scoring:
 * - textMatchScore (0-100): Postgres full-text search weight
 * - Recency bonus: recent interactions surface higher
 * - Advisor affinity: bonus if the searching advisor is the one assigned
 * - Lifecycle stage value: VIPs and at_risk surface higher
 */
export function rankCustomerSearchResults(
  input: SearchRankingInput,
): RankedSearchResult[] {
  const now = input.now ?? new Date();

  return input.results
    .map((customer) => {
      let score = customer.textMatchScore;

      // Recency bonus: last interaction within 30 days adds up to 25 points
      if (customer.lastInteractionAt) {
        const daysSinceInteraction = Math.floor(
          (now.getTime() - customer.lastInteractionAt.getTime()) / DAYS_MS,
        );
        if (daysSinceInteraction <= 30) {
          score += Math.round(25 * (1 - daysSinceInteraction / 30));
        }
      }

      // Order recency: last order within 90 days adds up to 15 points
      if (customer.lastOrderAt) {
        const daysSinceOrder = Math.floor(
          (now.getTime() - customer.lastOrderAt.getTime()) / DAYS_MS,
        );
        if (daysSinceOrder <= 90) {
          score += Math.round(15 * (1 - daysSinceOrder / 90));
        }
      }

      // Advisor affinity: bonus if the searching user is the assigned advisor
      if (customer.assignedToUserId === input.searchingUserId) {
        score += 30;
      }

      // Lifecycle stage value bonus
      score += STAGE_WEIGHTS[customer.lifecycleStage] ?? 0;

      return { customer, finalScore: score };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
}
