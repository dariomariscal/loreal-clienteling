import { Injectable, Inject } from "@nestjs/common";
import { and, eq, or, ilike, sql } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import { products, brands } from "@loreal/database";
import { rankProductSearchResults } from "@loreal/domain";
import type { ProductSemanticSearchResult } from "@loreal/contracts";
import {
  EMBEDDINGS_PROVIDER,
  type EmbeddingsProvider,
} from "../providers/embeddings.provider.interface";
import { ProductEmbeddingsRepository } from "../repositories/product-embeddings.repository";
import { AiUsageLogsRepository } from "../repositories/ai-usage-logs.repository";
import { estimateCostUsd } from "../pricing";
import { ScopeService } from "../../../common/services/scope.service";
import type { SessionUser } from "../../../common/types/session";

const FEATURE = "product_semantic_search";

@Injectable()
export class ProductSemanticSearchService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(EMBEDDINGS_PROVIDER) private embeddings: EmbeddingsProvider,
    private readonly repo: ProductEmbeddingsRepository,
    private readonly usageLogs: AiUsageLogsRepository,
    private readonly scopeService: ScopeService,
  ) {}

  async search(
    query: string,
    user: SessionUser,
    limit = 10,
  ): Promise<ProductSemanticSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const [lexicalMatches, vectorMatches] = await Promise.all([
      this.runLexical(trimmed, user, limit),
      this.runVector(trimmed, user, limit),
    ]);

    return rankProductSearchResults({
      lexicalMatches,
      vectorMatches,
      limit,
    });
  }

  private async runLexical(
    query: string,
    user: SessionUser,
    limit: number,
  ): Promise<ProductSemanticSearchResult[]> {
    const brandScope = this.scopeService.scopeByBrand(user, products.brandId);
    const pattern = `%${query}%`;

    const conditions = [
      eq(products.active, true),
      or(ilike(products.name, pattern), ilike(products.sku, pattern)),
      ...(brandScope ? [brandScope] : []),
    ];

    const rows = await this.db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        brandId: products.brandId,
        brandName: brands.displayName,
        category: products.category,
        subcategory: products.subcategory,
        price: products.price,
      })
      .from(products)
      .leftJoin(brands, eq(brands.id, products.brandId))
      .where(and(...conditions))
      .limit(limit);

    const q = query.toLowerCase();
    return rows.map((r) => ({
      productId: r.id,
      sku: r.sku,
      name: r.name,
      brandId: r.brandId,
      brandName: r.brandName,
      category: r.category,
      subcategory: r.subcategory,
      price: r.price,
      matchedOn: r.sku.toLowerCase().includes(q) ? "sku" : "name",
      similarity: null,
    }));
  }

  private async runVector(
    query: string,
    user: SessionUser,
    limit: number,
  ): Promise<ProductSemanticSearchResult[]> {
    const embed = await this.embeddings.embed({ input: query });
    await this.usageLogs.record({
      userId: user.id,
      feature: FEATURE,
      provider: "openai",
      model: embed.model,
      inputTokens: embed.inputTokens,
      outputTokens: 0,
      latencyMs: embed.latencyMs,
      costUsd: estimateCostUsd(embed.model, embed.inputTokens, 0),
    });

    // Over-fetch then apply brand scope in JS — scopeByBrand returns a SQL
    // fragment we can't easily inject into the repo's join, and the product
    // catalog is small enough that filtering a few hundred rows post-query is
    // cheap. Admin sees all brands; everyone else is pinned to user.brandId.
    const hits = await this.repo.search(embed.vectors[0], limit * 3);
    const filtered =
      user.role === "admin" || !user.brandId
        ? hits
        : hits.filter((h) => h.brandId === user.brandId);

    return filtered.slice(0, limit).map((hit) => ({
      productId: hit.productId,
      sku: hit.sku,
      name: hit.name,
      brandId: hit.brandId,
      brandName: hit.brandName,
      category: hit.category,
      subcategory: hit.subcategory,
      price: hit.price,
      matchedOn: "semantic" as const,
      similarity: hit.similarity,
    }));
  }
}
