/**
 * Reason codes for surfacing a customer in the daily opportunity queue.
 * Kept as a finite string union (not free text) so the UI can render an
 * icon / chip per reason consistently.
 */
export const OPPORTUNITY_REASONS = [
  "replenishment",
  "life_event",
  "win_back",
  "birthday",
  "vip_cadence",
  "new_product_match",
] as const;

export type OpportunityReason = (typeof OPPORTUNITY_REASONS)[number];

/**
 * A single suggestion the BA should act on today. Pre-computed nightly so
 * the home screen loads without invoking the LLM.
 */
export interface CustomerOpportunity {
  id: string;
  customerId: string;
  baUserId: string;
  forDate: string; // YYYY-MM-DD
  reason: OpportunityReason;
  summary: string;
  suggestedAction: string;
  suggestedMessageDraft?: string | null;
  priority: number;
  dismissedAt?: Date | null;
  actedAt?: Date | null;
  createdAt: Date;
}

export interface CustomerOpportunityWithCustomer extends CustomerOpportunity {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    lastContactAt?: Date | null;
    lastTransactionAt?: Date | null;
  };
}

/**
 * Signal bundle used by the domain selector. Each field is optional because
 * not every customer has every signal — the selector ranks based on whatever
 * is present.
 */
export interface OpportunitySignals {
  customerId: string;
  daysSinceLastTransaction?: number;
  daysSinceLastContact?: number;
  averagePurchaseIntervalDays?: number;
  daysUntilBirthday?: number;
  lifecycleSegment: string;
  predictedReplenishmentDueInDays?: number;
  hasUpcomingLifeEvent?: boolean;
  matchedNewProductId?: string;
}
