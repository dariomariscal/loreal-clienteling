import type {
  OpportunityReason,
  OpportunitySignals,
} from "@loreal/contracts";

export interface SelectedOpportunity {
  customerId: string;
  reason: OpportunityReason;
  priority: number;
  rationale: string;
}

export interface SelectDailyOpportunitiesInput {
  signals: OpportunitySignals[];
  limit?: number;
}

/**
 * Pure ranker. Given the raw signals for every customer in a BA's book,
 * select the top N opportunities for today and label each with a reason
 * code + numeric priority. No LLM here — this is deterministic, auditable
 * business logic.
 *
 * Priority is the absolute "importance" score the cron stores; the home
 * screen uses it for stable sort order. Higher = more urgent.
 */
export function selectDailyOpportunities(
  input: SelectDailyOpportunitiesInput,
): SelectedOpportunity[] {
  const limit = input.limit ?? 5;
  const scored: SelectedOpportunity[] = [];

  for (const s of input.signals) {
    const candidate = scoreSignal(s);
    if (candidate) scored.push(candidate);
  }

  scored.sort((a, b) => b.priority - a.priority);
  return scored.slice(0, limit);
}

function scoreSignal(s: OpportunitySignals): SelectedOpportunity | null {
  // Birthday — very high if within 7 days.
  if (s.daysUntilBirthday !== undefined && s.daysUntilBirthday <= 7) {
    return {
      customerId: s.customerId,
      reason: "birthday",
      priority: 100 - s.daysUntilBirthday * 2,
      rationale: `Cumpleaños en ${s.daysUntilBirthday} días`,
    };
  }

  // Replenishment — predicted due within the next 14 days.
  if (
    s.predictedReplenishmentDueInDays !== undefined &&
    s.predictedReplenishmentDueInDays <= 14
  ) {
    return {
      customerId: s.customerId,
      reason: "replenishment",
      priority: 80 - s.predictedReplenishmentDueInDays * 2,
      rationale: `Probable reabasto en ${s.predictedReplenishmentDueInDays} días`,
    };
  }

  // Life event — wedding, anniversary, etc. detected in notes.
  if (s.hasUpcomingLifeEvent) {
    return {
      customerId: s.customerId,
      reason: "life_event",
      priority: 75,
      rationale: "Evento personal próximo registrado en notas",
    };
  }

  // VIP cadence — VIP without contact in 21+ days is high priority.
  if (
    s.lifecycleSegment === "vip" &&
    s.daysSinceLastContact !== undefined &&
    s.daysSinceLastContact >= 21
  ) {
    return {
      customerId: s.customerId,
      reason: "vip_cadence",
      priority: 70 + Math.min(s.daysSinceLastContact - 21, 20),
      rationale: `VIP sin contacto hace ${s.daysSinceLastContact} días`,
    };
  }

  // New product match — model-suggested product matches preferences.
  if (s.matchedNewProductId) {
    return {
      customerId: s.customerId,
      reason: "new_product_match",
      priority: 55,
      rationale: "Nuevo producto que coincide con sus preferencias",
    };
  }

  // Win-back — at-risk customer (60–180 days without transaction).
  if (
    s.daysSinceLastTransaction !== undefined &&
    s.daysSinceLastTransaction >= 60 &&
    s.daysSinceLastTransaction <= 180
  ) {
    return {
      customerId: s.customerId,
      reason: "win_back",
      priority: 50 + Math.min(s.daysSinceLastTransaction - 60, 20),
      rationale: `Sin compras hace ${s.daysSinceLastTransaction} días`,
    };
  }

  return null;
}
