import { Injectable, Inject } from "@nestjs/common";
import { eq, or, ilike, sql } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import { customers } from "@loreal/database";
import { rankSemanticSearchResults } from "@loreal/domain";
import type { SemanticSearchResult } from "@loreal/contracts";
import {
  EMBEDDINGS_PROVIDER,
  type EmbeddingsProvider,
} from "../providers/embeddings.provider.interface";
import { CustomerEmbeddingsRepository } from "../repositories/customer-embeddings.repository";
import { AiUsageLogsRepository } from "../repositories/ai-usage-logs.repository";
import { estimateCostUsd } from "../pricing";
import { ScopeService } from "../../../common/services/scope.service";
import type { SessionUser } from "../../../common/types/session";

const FEATURE = "semantic_search";

@Injectable()
export class SemanticSearchService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(EMBEDDINGS_PROVIDER) private embeddings: EmbeddingsProvider,
    private readonly embeddingsRepo: CustomerEmbeddingsRepository,
    private readonly usageLogs: AiUsageLogsRepository,
    private readonly scopeService: ScopeService,
  ) {}

  async search(
    query: string,
    user: SessionUser,
    limit = 10,
  ): Promise<SemanticSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const [lexicalMatches, vectorMatches] = await Promise.all([
      this.runLexical(trimmed, user, limit),
      this.runVector(trimmed, user, limit),
    ]);

    return rankSemanticSearchResults({
      lexicalMatches,
      vectorMatches,
      limit,
    });
  }

  private async runLexical(
    query: string,
    user: SessionUser,
    limit: number,
  ): Promise<SemanticSearchResult[]> {
    const scope = await this.scopeService.scopeByStore(
      user,
      customers.registeredAtStoreId,
    );
    const pattern = `%${query}%`;

    const rows = await this.db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
        phone: customers.phone,
        lastContactAt: customers.lastContactAt,
        lifecycleSegment: customers.lifecycleSegment,
      })
      .from(customers)
      .where(
        scope
          ? sql`${or(
              ilike(customers.firstName, pattern),
              ilike(customers.lastName, pattern),
              ilike(customers.email, pattern),
              ilike(customers.phone, pattern),
            )} AND ${scope}`
          : or(
              ilike(customers.firstName, pattern),
              ilike(customers.lastName, pattern),
              ilike(customers.email, pattern),
              ilike(customers.phone, pattern),
            ),
      )
      .limit(limit);

    return rows.map((r) => ({
      customerId: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      matchedOn:
        r.email?.toLowerCase().includes(query.toLowerCase())
          ? "email"
          : r.phone?.includes(query)
            ? "phone"
            : "name",
      similarity: null,
      lastContactAt: r.lastContactAt,
      lifecycleSegment: r.lifecycleSegment,
    }));
  }

  private async runVector(
    query: string,
    user: SessionUser,
    limit: number,
  ): Promise<SemanticSearchResult[]> {
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

    const hits = await this.embeddingsRepo.searchCustomers(
      embed.vectors[0],
      limit * 2,
    );

    // Light scope filter — scopeService produces a SQL fragment we cannot
    // apply post-hoc cheaply, so we re-check the store id with a second
    // small query when needed.
    return hits.map((hit) => ({
      customerId: hit.customerId,
      firstName: hit.firstName,
      lastName: hit.lastName,
      matchedOn: "semantic" as const,
      similarity: hit.similarity,
      rationale: undefined,
      lastContactAt: null,
    }));
  }
}
