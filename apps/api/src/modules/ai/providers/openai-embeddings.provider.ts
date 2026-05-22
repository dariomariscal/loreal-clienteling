import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import type {
  EmbedOptions,
  EmbedResult,
  EmbeddingsProvider,
} from "./embeddings.provider.interface";

/**
 * OpenAI text-embedding-3-small produces 1536-dim vectors. If you switch to a
 * different model, update `dimensions` AND the `vector(N)` declaration on the
 * embedding tables — they must match.
 */
const TEXT_EMBEDDING_3_SMALL_DIMENSIONS = 1536;

@Injectable()
export class OpenAiEmbeddingsProvider implements EmbeddingsProvider {
  private readonly logger = new Logger(OpenAiEmbeddingsProvider.name);
  private readonly client: OpenAI;
  private readonly model: string;
  readonly dimensions: number = TEXT_EMBEDDING_3_SMALL_DIMENSIONS;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    this.client = new OpenAI({ apiKey });
    this.model =
      config.get<string>("OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-small";
  }

  async embed(options: EmbedOptions): Promise<EmbedResult> {
    const startedAt = Date.now();
    const input = Array.isArray(options.input) ? options.input : [options.input];

    const response = await this.client.embeddings.create({
      model: this.model,
      input,
    });

    return {
      vectors: response.data
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding),
      model: this.model,
      inputTokens: response.usage.total_tokens,
      latencyMs: Date.now() - startedAt,
    };
  }
}
