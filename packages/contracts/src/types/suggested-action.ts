/**
 * Trigger codes for surfacing a customer in the daily suggested-actions
 * queue. Kept as a finite string union (not free text) so the UI can render
 * an icon / chip per trigger consistently.
 */
export const SUGGESTED_ACTION_TRIGGERS = [
  "replenishment",
  "life_event",
  "win_back",
  "birthday",
  "vip_cadence",
  "new_product_match",
  "abandoned_cart",
  "post_purchase",
] as const;

export type SuggestedActionTrigger =
  (typeof SUGGESTED_ACTION_TRIGGERS)[number];

/**
 * A single suggestion the advisor should act on today. Pre-computed nightly
 * so the home screen loads without invoking the LLM.
 *
 * Term "suggested action" matches Salesforce Next Best Action / Microsoft
 * Dynamics / Tulip clienteling — not "opportunity" (which means a B2B sales
 * deal in standard CRM language).
 */
export interface SuggestedAction {
  id: string;
  customerId: string;
  assignedToUserId: string;
  dueDate: string; // YYYY-MM-DD
  triggerType: SuggestedActionTrigger;
  description: string;
  recommendedAction: string;
  suggestedMessageDraft?: string | null;
  priority: number;
  dismissedAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
}

export interface SuggestedActionWithCustomer extends SuggestedAction {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    lastInteractionAt?: Date | null;
    lastOrderAt?: Date | null;
  };
}

/**
 * Signal bundle used by the domain selector. Each field is optional because
 * not every customer has every signal — the selector ranks based on whatever
 * is present.
 */
export interface SuggestedActionSignals {
  customerId: string;
  daysSinceLastOrder?: number;
  daysSinceLastInteraction?: number;
  averageOrderIntervalDays?: number;
  daysUntilBirthday?: number;
  lifecycleStage: string;
  predictedReplenishmentDueInDays?: number;
  hasUpcomingLifeEvent?: boolean;
  matchedNewProductId?: string;
}
