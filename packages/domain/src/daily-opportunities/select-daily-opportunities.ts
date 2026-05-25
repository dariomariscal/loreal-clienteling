import type {
  SuggestedActionTrigger,
  SuggestedActionSignals,
} from "@loreal/contracts";

export interface SelectedSuggestedAction {
  customerId: string;
  triggerType: SuggestedActionTrigger;
  priority: number;
  rationale: string;
}

export interface SelectDailySuggestedActionsInput {
  signals: SuggestedActionSignals[];
  limit?: number;
}

/**
 * Pure ranker. Given the raw signals for every customer in an advisor's book,
 * select the top N suggested actions for today and label each with a trigger
 * code + numeric priority. No LLM here — this is deterministic, auditable
 * business logic.
 *
 * Priority is the absolute "importance" score the cron stores; the home
 * screen uses it for stable sort order. Higher = more urgent.
 */
export function selectDailySuggestedActions(
  input: SelectDailySuggestedActionsInput,
): SelectedSuggestedAction[] {
  const limit = input.limit ?? 5;
  const scored: SelectedSuggestedAction[] = [];

  for (const s of input.signals) {
    const candidate = scoreSignal(s);
    if (candidate) scored.push(candidate);
  }

  scored.sort((a, b) => b.priority - a.priority);
  return scored.slice(0, limit);
}

function scoreSignal(
  s: SuggestedActionSignals,
): SelectedSuggestedAction | null {
  // Birthday — very high if within 7 days.
  if (s.daysUntilBirthday !== undefined && s.daysUntilBirthday <= 7) {
    return {
      customerId: s.customerId,
      triggerType: "birthday",
      priority: 100 - s.daysUntilBirthday * 2,
      rationale: `Birthday in ${s.daysUntilBirthday} days`,
    };
  }

  // Replenishment — predicted due within the next 14 days.
  if (
    s.predictedReplenishmentDueInDays !== undefined &&
    s.predictedReplenishmentDueInDays <= 14
  ) {
    return {
      customerId: s.customerId,
      triggerType: "replenishment",
      priority: 80 - s.predictedReplenishmentDueInDays * 2,
      rationale: `Replenishment due in ${s.predictedReplenishmentDueInDays} days`,
    };
  }

  // Life event — wedding, anniversary, etc. detected in notes.
  if (s.hasUpcomingLifeEvent) {
    return {
      customerId: s.customerId,
      triggerType: "life_event",
      priority: 75,
      rationale: "Upcoming life event captured in notes",
    };
  }

  // VIP cadence — VIP without contact in 21+ days is high priority.
  if (
    s.lifecycleStage === "vip" &&
    s.daysSinceLastInteraction !== undefined &&
    s.daysSinceLastInteraction >= 21
  ) {
    return {
      customerId: s.customerId,
      triggerType: "vip_cadence",
      priority: 70 + Math.min(s.daysSinceLastInteraction - 21, 20),
      rationale: `VIP not contacted in ${s.daysSinceLastInteraction} days`,
    };
  }

  // New product match — model-suggested product matches preferences.
  if (s.matchedNewProductId) {
    return {
      customerId: s.customerId,
      triggerType: "new_product_match",
      priority: 55,
      rationale: "New product matches her preferences",
    };
  }

  // Win-back — at-risk customer (60–180 days without an order).
  if (
    s.daysSinceLastOrder !== undefined &&
    s.daysSinceLastOrder >= 60 &&
    s.daysSinceLastOrder <= 180
  ) {
    return {
      customerId: s.customerId,
      triggerType: "win_back",
      priority: 50 + Math.min(s.daysSinceLastOrder - 60, 20),
      rationale: `No order in ${s.daysSinceLastOrder} days`,
    };
  }

  return null;
}
