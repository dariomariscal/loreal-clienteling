import { Injectable, Inject, Logger, NotFoundException } from "@nestjs/common";
import { eq, desc, and, gte } from "drizzle-orm";
import {
  DATABASE_TOKEN,
  type Database,
} from "../../../config/database.provider";
import {
  customers,
  products,
  orders,
  lineItems,
  beautyProfiles,
} from "@loreal/database";
import {
  rankProductRecommendations,
  buildRecommendationReasonPrompt,
} from "@loreal/domain";
import type {
  ProductRecommendationCandidate,
  RankedProductRecommendation,
  RecommendationReasonSignals,
} from "@loreal/contracts";
import {
  LLM_PROVIDER,
  type LlmProvider,
} from "../../ai/providers/llm.provider.interface";
import { AiUsageLogsRepository } from "../../ai/repositories/ai-usage-logs.repository";
import { estimateCostUsd } from "../../ai/pricing";
import { CustomerPreferencesRepository } from "../repositories/customer-preferences.repository";
import { RecommendationsRepository } from "../repositories/recommendations.repository";
import type { RecommendationSignalSourceStrategy } from "../sources/recommendation-signal-source";
import { SemanticMatchSource } from "../sources/semantic-match.source";
import { LookalikePurchaseSource } from "../sources/lookalike-purchase.source";
import { ReplenishmentDueSource } from "../sources/replenishment-due.source";

const FEATURE = "recommendation_reason";
const CANDIDATES_PER_SOURCE = 20;
const REASON_LOOKBACK_TITLES = 3;
const DEFAULT_OUTPUT_LIMIT = 5;
/** Env var that lets ops swap the rationale model without a code change.
 *  Defaults to Haiku 4.5 — rationales are ≤25-word JSON, the cheaper model
 *  performs equivalently and reduces per-customer latency by ~5x vs Sonnet. */
const RATIONALE_MODEL_ENV = "ANTHROPIC_RECOMMENDATION_MODEL";
const RATIONALE_MODEL_DEFAULT = "claude-haiku-4-5-20251001";

export interface EngineRecommendationOutput {
  productId: string;
  sku: string;
  title: string;
  brandName: string | null;
  price: string;
  images: string[];
  score: number;
  signals: RecommendationReasonSignals;
  contributingSources: string[];
  rationale: string | null;
  messageDraft: string | null;
}

export interface GenerateOptions {
  customerId: string;
  storeId: string;
  brandId: string;
  recommendedByUserId: string;
  limit?: number;
  /** Skip LLM rationale generation. Used by the nightly NBA cron, which fans
   *  out across thousands of customers and only needs deterministic data. */
  withRationale?: boolean;
  /** Persist the ranked output to the `recommendations` table. */
  persist?: boolean;
}

/**
 * Recommendation Engine — orchestrates the multi-signal pipeline:
 *
 *   1. Build the customer preference snapshot (preferences repo).
 *   2. Fan out across registered signal sources in parallel.
 *   3. Hydrate ranking metadata for the union of returned candidates.
 *   4. Hand both to the pure ranker (`rankProductRecommendations`).
 *   5. Optionally generate per-product rationale + message draft via LLM.
 *   6. Optionally persist as `recommendations` rows with `source='ai_suggested'`.
 *
 * The service is "boring on purpose": every piece of business logic lives in
 * a pure domain function or a repository. The orchestrator owns wiring,
 * parallelism, telemetry and persistence — nothing else.
 */
@Injectable()
export class RecommendationEngineService {
  private readonly logger = new Logger(RecommendationEngineService.name);
  private readonly sources: RecommendationSignalSourceStrategy[];

  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(LLM_PROVIDER) private llm: LlmProvider,
    private readonly preferencesRepo: CustomerPreferencesRepository,
    private readonly recommendationsRepo: RecommendationsRepository,
    private readonly usageLogs: AiUsageLogsRepository,
    semanticMatchSource: SemanticMatchSource,
    lookalikePurchaseSource: LookalikePurchaseSource,
    replenishmentDueSource: ReplenishmentDueSource,
  ) {
    // Order is informational only — the ranker fuses by productId.
    this.sources = [
      replenishmentDueSource,
      semanticMatchSource,
      lookalikePurchaseSource,
    ];
  }

  async generateForCustomer(
    options: GenerateOptions,
  ): Promise<EngineRecommendationOutput[]> {
    const limit = options.limit ?? DEFAULT_OUTPUT_LIMIT;

    const snapshot = await this.preferencesRepo.findSnapshot(options.customerId);
    if (!snapshot) throw new NotFoundException("Customer not found");

    const candidates = await this.collectCandidates({
      customerId: options.customerId,
      storeId: options.storeId,
      brandId: options.brandId,
      excludeProductIds: snapshot.purchasedProductIds,
    });
    if (candidates.length === 0) return [];

    const uniqueProductIds = Array.from(
      new Set(candidates.map((c) => c.productId)),
    );
    const productMetadata = await this.recommendationsRepo.findRankingMetadata(
      uniqueProductIds,
      options.storeId,
    );

    const ranked = rankProductRecommendations({
      customer: snapshot,
      candidates,
      productMetadata,
      limit,
    });
    if (ranked.length === 0) return [];

    const displayMetadata = await this.recommendationsRepo.findDisplayMetadata(
      ranked.map((r) => r.productId),
    );

    const reasonByProduct = options.withRationale
      ? await this.generateRationales(options.customerId, ranked, displayMetadata)
      : new Map<string, { rationale: string; messageDraft: string }>();

    if (options.persist) {
      await this.persist({
        customerId: options.customerId,
        storeId: options.storeId,
        recommendedByUserId: options.recommendedByUserId,
        ranked,
        reasonByProduct,
      });
    }

    return ranked.map((r) => {
      const display = displayMetadata[r.productId];
      const reason = reasonByProduct.get(r.productId);
      return {
        productId: r.productId,
        sku: display?.sku ?? "",
        title: display?.title ?? "",
        brandName: display?.brandName ?? null,
        price: display?.price ?? "0",
        images: display?.images ?? [],
        score: r.score,
        signals: r.signals,
        contributingSources: r.contributingSources,
        rationale: reason?.rationale ?? null,
        messageDraft: reason?.messageDraft ?? null,
      };
    });
  }

  private async collectCandidates(input: {
    customerId: string;
    storeId: string;
    brandId: string;
    excludeProductIds: string[];
  }): Promise<ProductRecommendationCandidate[]> {
    const settled = await Promise.allSettled(
      this.sources.map((source) =>
        source.fetchCandidates({
          customerId: input.customerId,
          storeId: input.storeId,
          brandId: input.brandId,
          excludeProductIds: input.excludeProductIds,
          limit: CANDIDATES_PER_SOURCE,
        }),
      ),
    );

    const candidates: ProductRecommendationCandidate[] = [];
    settled.forEach((result, i) => {
      const sourceName = this.sources[i].name;
      if (result.status === "fulfilled") {
        candidates.push(...result.value);
      } else {
        this.logger.warn(
          `Signal source "${sourceName}" failed: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
        );
      }
    });
    return candidates;
  }

  private async generateRationales(
    customerId: string,
    ranked: RankedProductRecommendation[],
    displayMetadata: Awaited<
      ReturnType<RecommendationsRepository["findDisplayMetadata"]>
    >,
  ): Promise<Map<string, { rationale: string; messageDraft: string }>> {
    const out = new Map<string, { rationale: string; messageDraft: string }>();
    const context = await this.buildReasonContext(customerId);
    if (!context) return out;

    // Fan out per-product LLM calls in parallel. Each call is independent
    // (no shared state, no race on the LLM provider), so a 5-product batch
    // resolves in ~1 LLM round-trip instead of ~5.
    const settled = await Promise.allSettled(
      ranked.map((r) => this.generateRationaleFor(r, context, displayMetadata)),
    );
    settled.forEach((result, i) => {
      const r = ranked[i];
      if (result.status === "fulfilled" && result.value) {
        out.set(r.productId, result.value);
      } else if (result.status === "rejected") {
        this.logger.warn(
          `Rationale generation failed for product ${r.productId}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
        );
      }
    });
    return out;
  }

  private async generateRationaleFor(
    r: RankedProductRecommendation,
    context: {
      firstName: string;
      preferredLanguage: string;
      skinConcerns: string[];
      avoidedIngredients: string[];
      lastPurchasedTitles: string[];
    },
    displayMetadata: Awaited<
      ReturnType<RecommendationsRepository["findDisplayMetadata"]>
    >,
  ): Promise<{ rationale: string; messageDraft: string } | null> {
    const detail = await this.fetchProductDetail(r.productId);
    if (!detail) return null;

    const display = displayMetadata[r.productId];
    const prompt = buildRecommendationReasonPrompt({
      customerFirstName: context.firstName,
      preferredLanguage: context.preferredLanguage,
      product: {
        title: detail.title,
        brandName: display?.brandName ?? null,
        talkingPoints: detail.talkingPoints,
        targetConcerns: detail.targetConcerns,
      },
      customerContext: {
        skinConcerns: context.skinConcerns,
        avoidedIngredients: context.avoidedIngredients,
        lastPurchasedTitles: context.lastPurchasedTitles,
      },
      signals: r.signals,
    });

    const result = await this.llm.generate({
      system: prompt.system,
      user: prompt.user,
      feature: FEATURE,
      modelOverride:
        process.env[RATIONALE_MODEL_ENV] ?? RATIONALE_MODEL_DEFAULT,
      maxOutputTokens: 300,
      temperature: 0.4,
    });

    await this.usageLogs.record({
      userId: null,
      feature: FEATURE,
      provider: "anthropic",
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cachedTokens: result.cachedTokens,
      latencyMs: result.latencyMs,
      costUsd: estimateCostUsd(
        result.model,
        result.inputTokens,
        result.outputTokens,
        result.cachedTokens,
      ),
    });

    return parseReasonResponse(result.text);
  }

  private async buildReasonContext(customerId: string): Promise<{
    firstName: string;
    preferredLanguage: string;
    skinConcerns: string[];
    avoidedIngredients: string[];
    lastPurchasedTitles: string[];
  } | null> {
    const [customer] = await this.db
      .select({
        firstName: customers.firstName,
        preferredLanguage: customers.preferredLanguage,
      })
      .from(customers)
      .where(eq(customers.id, customerId));
    if (!customer) return null;

    const [profile] = await this.db
      .select({
        skinConcerns: beautyProfiles.skinConcerns,
        avoidedIngredients: beautyProfiles.avoidedIngredients,
      })
      .from(beautyProfiles)
      .where(eq(beautyProfiles.customerId, customerId));

    const lookback = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const lastTitles = await this.db
      .select({ title: products.title })
      .from(lineItems)
      .innerJoin(orders, eq(orders.id, lineItems.orderId))
      .innerJoin(products, eq(products.id, lineItems.productId))
      .where(
        and(
          eq(orders.customerId, customerId),
          gte(orders.processedAt, lookback),
        ),
      )
      .orderBy(desc(orders.processedAt))
      .limit(REASON_LOOKBACK_TITLES);

    return {
      firstName: customer.firstName,
      preferredLanguage: customer.preferredLanguage,
      skinConcerns: profile?.skinConcerns ?? [],
      avoidedIngredients: profile?.avoidedIngredients ?? [],
      lastPurchasedTitles: lastTitles.map((t) => t.title),
    };
  }

  private async fetchProductDetail(productId: string): Promise<{
    title: string;
    targetConcerns: string[];
    talkingPoints: string | null;
  } | null> {
    const [row] = await this.db
      .select({
        title: products.title,
        targetConcerns: products.targetConcerns,
        talkingPoints: products.talkingPoints,
      })
      .from(products)
      .where(eq(products.id, productId));
    if (!row) return null;
    return {
      title: row.title,
      targetConcerns: row.targetConcerns ?? [],
      talkingPoints: row.talkingPoints,
    };
  }

  private async persist(input: {
    customerId: string;
    storeId: string;
    recommendedByUserId: string;
    ranked: RankedProductRecommendation[];
    reasonByProduct: Map<string, { rationale: string; messageDraft: string }>;
  }): Promise<void> {
    await this.recommendationsRepo.insertManyFromEngine(
      input.ranked.map((r) => ({
        customerId: input.customerId,
        productId: r.productId,
        recommendedByUserId: input.recommendedByUserId,
        storeId: input.storeId,
        source: "ai_suggested",
        aiReasoning: input.reasonByProduct.get(r.productId)?.rationale ?? null,
        reasonSignals: r.signals,
        engineScore: r.score,
      })),
    );
  }
}

function parseReasonResponse(
  raw: string,
): { rationale: string; messageDraft: string } | null {
  const cleaned = stripCodeFence(raw).trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<{
      rationale: string;
      messageDraft: string;
    }>;
    if (
      typeof parsed.rationale === "string" &&
      typeof parsed.messageDraft === "string"
    ) {
      return { rationale: parsed.rationale, messageDraft: parsed.messageDraft };
    }
  } catch {
    // fall through
  }
  return null;
}

function stripCodeFence(text: string): string {
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/m;
  const match = text.trim().match(fence);
  return match ? match[1] : text;
}
