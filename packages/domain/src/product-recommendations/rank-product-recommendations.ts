import type {
  CustomerPreferenceSnapshot,
  ProductRankingMetadata,
  ProductRecommendationCandidate,
  RankProductRecommendationsInput,
  RankedProductRecommendation,
  RecommendationReasonSignals,
  RecommendationSignalSource,
} from "@loreal/contracts";

/**
 * Pure product re-ranker.
 *
 * Receives candidates emitted by independent signal sources (content
 * affinity, semantic match, lookalike purchase, replenishment due) and
 * fuses them per product into a single ranked list. No DB, no LLM, no
 * I/O — same shape as `selectDailySuggestedActions`.
 *
 * Algorithm:
 *   1. Group candidates by productId so the same product surfaced by two
 *      sources stacks instead of competing.
 *   2. Apply hard filters: out of stock, ingredient in `avoidedIngredients`,
 *      already purchased.
 *   3. Compute a soft content-based score from the customer preference
 *      snapshot ↔ product metadata.
 *   4. Fuse: weighted sum of source contributions + content score +
 *      replenishment boost − routine-cannibalisation penalty.
 *   5. Sort, slice, emit `reason_signals` for persistence and UI chips.
 */

interface FusedCandidate {
  productId: string;
  sourceScores: Partial<Record<RecommendationSignalSource, number>>;
  replenishmentDaysUntilDepletion?: number;
}

const SOURCE_WEIGHTS: Record<RecommendationSignalSource, number> = {
  content_affinity: 0.25,
  semantic_match: 0.25,
  lookalike_purchase: 0.2,
  replenishment_due: 0.3,
};

const CONTENT_AFFINITY_WEIGHT = 0.4;
const ROUTINE_CANNIBALISATION_PENALTY = 0.15;
const PRICE_BAND_TOLERANCE_RATIO = 0.5;

export function rankProductRecommendations(
  input: RankProductRecommendationsInput,
): RankedProductRecommendation[] {
  const limit = input.limit ?? 10;
  const fused = fuseCandidatesByProduct(input.candidates);

  const ranked: RankedProductRecommendation[] = [];
  for (const candidate of fused.values()) {
    const product = input.productMetadata[candidate.productId];
    if (!product) continue;
    if (isHardFiltered(product, input.customer)) continue;

    const contentAffinity = scoreContentAffinity(product, input.customer);
    const signals = buildReasonSignals(candidate, contentAffinity);

    const fusedScore = computeFusedScore({
      candidate,
      contentAffinity,
      product,
      customer: input.customer,
    });
    if (fusedScore <= 0) continue;

    ranked.push({
      productId: candidate.productId,
      score: round(fusedScore),
      signals,
      contributingSources: sortedContributingSources(candidate, contentAffinity),
    });
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, limit);
}

function fuseCandidatesByProduct(
  candidates: ProductRecommendationCandidate[],
): Map<string, FusedCandidate> {
  const byProduct = new Map<string, FusedCandidate>();
  for (const c of candidates) {
    const existing = byProduct.get(c.productId) ?? {
      productId: c.productId,
      sourceScores: {},
    };
    const prior = existing.sourceScores[c.source];
    existing.sourceScores[c.source] =
      prior === undefined ? clamp01(c.score) : Math.max(prior, clamp01(c.score));
    if (c.replenishmentDaysUntilDepletion !== undefined) {
      existing.replenishmentDaysUntilDepletion =
        c.replenishmentDaysUntilDepletion;
    }
    byProduct.set(c.productId, existing);
  }
  return byProduct;
}

function isHardFiltered(
  product: ProductRankingMetadata,
  customer: CustomerPreferenceSnapshot,
): boolean {
  if (!product.hasStock) return true;
  if (customer.purchasedProductIds.includes(product.productId)) return true;
  if (
    customer.avoidedIngredients.length > 0 &&
    intersects(product.ingredients, customer.avoidedIngredients)
  ) {
    return true;
  }
  return false;
}

function scoreContentAffinity(
  product: ProductRankingMetadata,
  customer: CustomerPreferenceSnapshot,
): number {
  const concernMatch = jaccard(product.targetConcerns, customer.skinConcerns);
  const ingredientMatch = jaccard(
    product.ingredients,
    customer.preferredIngredients,
  );
  const brandAffinity = normaliseBrandAffinity(
    customer.brandAffinity,
    product.brandId,
  );
  const priceBand = scorePriceBand(product.price, customer.averageOrderValue);

  return clamp01(
    0.4 * concernMatch +
      0.25 * ingredientMatch +
      0.2 * brandAffinity +
      0.15 * priceBand,
  );
}

function computeFusedScore(args: {
  candidate: FusedCandidate;
  contentAffinity: number;
  product: ProductRankingMetadata;
  customer: CustomerPreferenceSnapshot;
}): number {
  const { candidate, contentAffinity, product, customer } = args;

  let score = 0;
  for (const [source, weight] of Object.entries(SOURCE_WEIGHTS) as Array<
    [RecommendationSignalSource, number]
  >) {
    const sourceScore = candidate.sourceScores[source] ?? 0;
    score += weight * sourceScore;
  }
  score += CONTENT_AFFINITY_WEIGHT * contentAffinity;

  if (sharesProductType(product, customer, candidate.productId)) {
    score -= ROUTINE_CANNIBALISATION_PENALTY;
  }

  return clamp01(score);
}

function buildReasonSignals(
  candidate: FusedCandidate,
  contentAffinity: number,
): RecommendationReasonSignals {
  const signals: RecommendationReasonSignals = {};
  if (candidate.sourceScores.content_affinity !== undefined || contentAffinity > 0) {
    signals.contentAffinity = round(
      Math.max(candidate.sourceScores.content_affinity ?? 0, contentAffinity),
    );
  }
  if (candidate.sourceScores.semantic_match !== undefined) {
    signals.semanticMatch = round(candidate.sourceScores.semantic_match);
  }
  if (candidate.sourceScores.lookalike_purchase !== undefined) {
    signals.lookalikePurchase = round(candidate.sourceScores.lookalike_purchase);
  }
  if (candidate.sourceScores.replenishment_due !== undefined) {
    signals.replenishmentDue = round(candidate.sourceScores.replenishment_due);
    if (candidate.replenishmentDaysUntilDepletion !== undefined) {
      signals.replenishmentDaysUntilDepletion =
        candidate.replenishmentDaysUntilDepletion;
    }
  }
  return signals;
}

function sortedContributingSources(
  candidate: FusedCandidate,
  contentAffinity: number,
): RecommendationSignalSource[] {
  const entries: Array<[RecommendationSignalSource, number]> = [];
  for (const source of Object.keys(SOURCE_WEIGHTS) as RecommendationSignalSource[]) {
    const explicit = candidate.sourceScores[source];
    if (explicit !== undefined && explicit > 0) {
      entries.push([source, explicit]);
    } else if (source === "content_affinity" && contentAffinity > 0) {
      entries.push([source, contentAffinity]);
    }
  }
  entries.sort((a, b) => b[1] - a[1]);
  return entries.map(([source]) => source);
}

function sharesProductType(
  product: ProductRankingMetadata,
  customer: CustomerPreferenceSnapshot,
  productId: string,
): boolean {
  if (!product.productType) return false;
  // The ranker doesn't carry the routine's productType, only its productIds.
  // The orchestrator could pre-compute this; for now we approximate by
  // checking direct id overlap, which the orchestrator strips before calling.
  return customer.routineProductIds.includes(productId);
}

function normaliseBrandAffinity(
  affinity: Record<string, number>,
  brandId: string,
): number {
  const total = Object.values(affinity).reduce((sum, n) => sum + n, 0);
  if (total === 0) return 0;
  return clamp01((affinity[brandId] ?? 0) / total);
}

function scorePriceBand(price: number, averageOrderValue: number): number {
  if (averageOrderValue <= 0) return 0.5; // unknown — neutral
  const ratio = price / averageOrderValue;
  // Best when price is within ±50% of the customer's typical ticket.
  const diff = Math.abs(ratio - 1);
  return clamp01(1 - diff / PRICE_BAND_TOLERANCE_RATIO);
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const v of setA) if (setB.has(v)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function intersects(a: string[], b: string[]): boolean {
  const setB = new Set(b);
  for (const v of a) if (setB.has(v)) return true;
  return false;
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
