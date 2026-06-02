import { Injectable, Inject, Logger } from "@nestjs/common";
import { eq, and, desc, gte } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import {
  customers,
  beautyProfiles,
  orders,
  lineItems,
  products,
  customerVisits,
  notes,
} from "@loreal/database";
import {
  EMBEDDINGS_PROVIDER,
  type EmbeddingsProvider,
} from "../providers/embeddings.provider.interface";
import { CustomerEmbeddingsRepository } from "../repositories/customer-embeddings.repository";
import { AiUsageLogsRepository } from "../repositories/ai-usage-logs.repository";
import { estimateCostUsd } from "../pricing";

const FEATURE = "customer_embedding";
const RECENT_ORDERS_LIMIT = 10;
const RECENT_VISITS_LIMIT = 5;
const RECENT_NOTES_LIMIT = 5;
const ORDER_LOOKBACK_DAYS = 365;

interface CustomerEmbeddingInputContext {
  firstName: string;
  lastName: string;
  lifecycleStage: string;
  loyaltyTier: string | null;
  beautyProfile: {
    skinType: string | null;
    skinTone: string | null;
    undertone: string | null;
    skinConcerns: string[];
    preferredIngredients: string[];
    avoidedIngredients: string[];
    hairType: string | null;
    fragranceFamilies: string[];
    interests: string[];
  } | null;
  recentProducts: string[];
  recentVisitReasons: string[];
  recentNoteSnippets: string[];
}

/**
 * Generates and stores the embedding vector for a single customer. The vector
 * captures the customer's "identity" — beauty profile, recent buys, recent
 * visit reasons, recent notes — and is used by:
 *
 *   - Semantic customer search ("la señora del labial rojo").
 *   - The recommendation engine to find products and lookalike buyers.
 *
 * Fire-and-forget from write paths via `embedCustomerInBackground`. Failures
 * are logged but never propagate to the user-facing request.
 */
@Injectable()
export class CustomerEmbeddingService {
  private readonly logger = new Logger(CustomerEmbeddingService.name);

  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(EMBEDDINGS_PROVIDER) private embeddings: EmbeddingsProvider,
    private readonly repo: CustomerEmbeddingsRepository,
    private readonly usageLogs: AiUsageLogsRepository,
  ) {}

  async embedCustomer(customerId: string): Promise<void> {
    const context = await this.buildContext(customerId);
    if (!context) {
      this.logger.warn(`embedCustomer skipped — customer ${customerId} not found`);
      return;
    }

    const input = serialiseContext(context);
    const result = await this.embeddings.embed({ input });

    await this.repo.upsertCustomer({
      id: customerId,
      embedding: result.vectors[0],
      model: result.model,
    });

    await this.usageLogs.record({
      userId: null,
      feature: FEATURE,
      provider: "openai",
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: 0,
      latencyMs: result.latencyMs,
      costUsd: estimateCostUsd(result.model, result.inputTokens, 0),
    });
  }

  embedCustomerInBackground(customerId: string): void {
    void this.embedCustomer(customerId).catch((err) => {
      this.logger.error(
        `Background embedding failed for customer ${customerId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  }

  private async buildContext(
    customerId: string,
  ): Promise<CustomerEmbeddingInputContext | null> {
    const [customer] = await this.db
      .select({
        firstName: customers.firstName,
        lastName: customers.lastName,
        lifecycleStage: customers.lifecycleStage,
        loyaltyTier: customers.loyaltyTier,
      })
      .from(customers)
      .where(eq(customers.id, customerId));
    if (!customer) return null;

    const [profile] = await this.db
      .select({
        skinType: beautyProfiles.skinType,
        skinTone: beautyProfiles.skinTone,
        undertone: beautyProfiles.undertone,
        skinConcerns: beautyProfiles.skinConcerns,
        preferredIngredients: beautyProfiles.preferredIngredients,
        avoidedIngredients: beautyProfiles.avoidedIngredients,
        hairType: beautyProfiles.hairType,
        fragranceFamilies: beautyProfiles.fragranceFamilies,
        interests: beautyProfiles.interests,
      })
      .from(beautyProfiles)
      .where(eq(beautyProfiles.customerId, customerId));

    const lookbackDate = new Date(
      Date.now() - ORDER_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    );

    const recentProducts = await this.db
      .select({ title: products.title })
      .from(lineItems)
      .innerJoin(orders, eq(orders.id, lineItems.orderId))
      .innerJoin(products, eq(products.id, lineItems.productId))
      .where(
        and(
          eq(orders.customerId, customerId),
          gte(orders.processedAt, lookbackDate),
        ),
      )
      .orderBy(desc(orders.processedAt))
      .limit(RECENT_ORDERS_LIMIT);

    const recentVisits = await this.db
      .select({ visitReason: customerVisits.visitReason })
      .from(customerVisits)
      .where(eq(customerVisits.customerId, customerId))
      .orderBy(desc(customerVisits.startedAt))
      .limit(RECENT_VISITS_LIMIT);

    const recentNotes = await this.db
      .select({ body: notes.body })
      .from(notes)
      .where(eq(notes.customerId, customerId))
      .orderBy(desc(notes.createdAt))
      .limit(RECENT_NOTES_LIMIT);

    return {
      firstName: customer.firstName,
      lastName: customer.lastName,
      lifecycleStage: customer.lifecycleStage,
      loyaltyTier: customer.loyaltyTier,
      beautyProfile: profile
        ? {
            skinType: profile.skinType,
            skinTone: profile.skinTone,
            undertone: profile.undertone,
            skinConcerns: profile.skinConcerns ?? [],
            preferredIngredients: profile.preferredIngredients ?? [],
            avoidedIngredients: profile.avoidedIngredients ?? [],
            hairType: profile.hairType,
            fragranceFamilies: profile.fragranceFamilies ?? [],
            interests: profile.interests ?? [],
          }
        : null,
      recentProducts: recentProducts.map((p) => p.title),
      recentVisitReasons: recentVisits
        .map((v) => v.visitReason)
        .filter((r): r is string => Boolean(r)),
      recentNoteSnippets: recentNotes.map((n) => truncate(n.body, 200)),
    };
  }
}

function serialiseContext(ctx: CustomerEmbeddingInputContext): string {
  const parts: string[] = [];
  parts.push(`Cliente: ${ctx.firstName} ${ctx.lastName}.`);
  parts.push(`Etapa: ${ctx.lifecycleStage}.`);
  if (ctx.loyaltyTier) parts.push(`Lealtad: ${ctx.loyaltyTier}.`);

  if (ctx.beautyProfile) {
    const bp = ctx.beautyProfile;
    if (bp.skinType) parts.push(`Piel: ${bp.skinType}.`);
    if (bp.skinTone) parts.push(`Tono: ${bp.skinTone}.`);
    if (bp.undertone) parts.push(`Subtono: ${bp.undertone}.`);
    if (bp.skinConcerns.length)
      parts.push(`Preocupaciones de piel: ${bp.skinConcerns.join(", ")}.`);
    if (bp.preferredIngredients.length)
      parts.push(`Ingredientes preferidos: ${bp.preferredIngredients.join(", ")}.`);
    if (bp.avoidedIngredients.length)
      parts.push(`Ingredientes evitados: ${bp.avoidedIngredients.join(", ")}.`);
    if (bp.hairType) parts.push(`Cabello: ${bp.hairType}.`);
    if (bp.fragranceFamilies.length)
      parts.push(`Fragancias: ${bp.fragranceFamilies.join(", ")}.`);
    if (bp.interests.length) parts.push(`Intereses: ${bp.interests.join(", ")}.`);
  }

  if (ctx.recentProducts.length)
    parts.push(`Compras recientes: ${ctx.recentProducts.join("; ")}.`);
  if (ctx.recentVisitReasons.length)
    parts.push(`Motivos de visita: ${ctx.recentVisitReasons.join(", ")}.`);
  if (ctx.recentNoteSnippets.length)
    parts.push(`Notas: ${ctx.recentNoteSnippets.join(" | ")}.`);

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, max)}…`;
}
