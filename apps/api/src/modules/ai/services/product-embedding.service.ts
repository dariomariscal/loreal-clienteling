import { Injectable, Inject, Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import { products } from "@loreal/database";
import {
  EMBEDDINGS_PROVIDER,
  type EmbeddingsProvider,
} from "../providers/embeddings.provider.interface";
import { ProductEmbeddingsRepository } from "../repositories/product-embeddings.repository";
import { AiUsageLogsRepository } from "../repositories/ai-usage-logs.repository";
import { estimateCostUsd } from "../pricing";

const FEATURE = "product_embedding";

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  ingredients: string[] | null;
  salesArgument: string | null;
}

function buildEmbeddingInput(p: ProductRow): string {
  const ingredients = p.ingredients?.length
    ? `Ingredientes: ${p.ingredients.join(", ")}.`
    : "";
  return [
    `${p.name} (SKU ${p.sku}).`,
    `Categoría: ${p.category}${p.subcategory ? ` / ${p.subcategory}` : ""}.`,
    p.description ?? "",
    p.salesArgument ?? "",
    ingredients,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generates and stores the embedding vector for a single product. Called
 * fire-and-forget from ProductsService after create/update — failures are
 * logged but never block the user-facing write. A nightly cron (or the manual
 * backfill script) is the safety net for missed embeddings.
 */
@Injectable()
export class ProductEmbeddingService {
  private readonly logger = new Logger(ProductEmbeddingService.name);

  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(EMBEDDINGS_PROVIDER) private embeddings: EmbeddingsProvider,
    private readonly repo: ProductEmbeddingsRepository,
    private readonly usageLogs: AiUsageLogsRepository,
  ) {}

  async embedProduct(productId: string): Promise<void> {
    const [row] = await this.db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.title,
        category: products.category,
        subcategory: products.subcategory,
        description: products.description,
        ingredients: products.ingredients,
        salesArgument: products.talkingPoints,
      })
      .from(products)
      .where(eq(products.id, productId));

    if (!row) {
      this.logger.warn(`embedProduct skipped — product ${productId} not found`);
      return;
    }

    const input = buildEmbeddingInput(row);
    const result = await this.embeddings.embed({ input });
    const vector = result.vectors[0];

    await this.repo.upsert({
      productId: row.id,
      embedding: vector,
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

  /**
   * Fire-and-forget wrapper. Use this from write paths (create/update) where
   * the user shouldn't pay the OpenAI latency cost and a transient failure
   * must not roll back the DB write.
   */
  embedProductInBackground(productId: string): void {
    void this.embedProduct(productId).catch((err) => {
      this.logger.error(
        `Background embedding failed for product ${productId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  }
}
