import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import type {
  LlmGenerateOptions,
  LlmGenerateResult,
  LlmProvider,
  LlmStreamChunk,
} from "./llm.provider.interface";

@Injectable()
export class AnthropicProvider implements LlmProvider {
  private readonly logger = new Logger(AnthropicProvider.name);
  private clientInstance: Anthropic | null = null;
  private readonly defaultModel: string;

  constructor(private readonly config: ConfigService) {
    this.defaultModel =
      config.get<string>("ANTHROPIC_SUMMARY_MODEL") ?? "claude-sonnet-4-5-20250929";
  }

  private get client(): Anthropic {
    if (this.clientInstance) return this.clientInstance;
    const apiKey = this.config.get<string>("ANTHROPIC_API_KEY");
    if (!apiKey || apiKey === "sk-ant-your-key-here") {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    this.clientInstance = new Anthropic({ apiKey });
    return this.clientInstance;
  }

  async generate(options: LlmGenerateOptions): Promise<LlmGenerateResult> {
    const model = options.modelOverride ?? this.defaultModel;
    const startedAt = Date.now();

    const response = await this.client.messages.create({
      model,
      max_tokens: options.maxOutputTokens ?? 1024,
      temperature: options.temperature ?? 0.4,
      system: options.system,
      messages: [{ role: "user", content: options.user }],
      stop_sequences: options.stopSequences,
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return {
      text,
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cachedTokens:
        (response.usage as { cache_read_input_tokens?: number })
          .cache_read_input_tokens ?? 0,
      latencyMs: Date.now() - startedAt,
    };
  }

  async *stream(options: LlmGenerateOptions): AsyncIterable<LlmStreamChunk> {
    const model = options.modelOverride ?? this.defaultModel;
    const startedAt = Date.now();
    let inputTokens = 0;
    let outputTokens = 0;
    let cachedTokens = 0;
    let aggregated = "";

    try {
      const stream = this.client.messages.stream({
        model,
        max_tokens: options.maxOutputTokens ?? 1024,
        temperature: options.temperature ?? 0.4,
        system: options.system,
        messages: [{ role: "user", content: options.user }],
        stop_sequences: options.stopSequences,
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          aggregated += event.delta.text;
          yield { type: "text", delta: event.delta.text };
        } else if (event.type === "message_start") {
          inputTokens = event.message.usage.input_tokens;
          cachedTokens =
            (event.message.usage as { cache_read_input_tokens?: number })
              .cache_read_input_tokens ?? 0;
        } else if (event.type === "message_delta") {
          outputTokens = event.usage.output_tokens;
        }
      }

      yield {
        type: "done",
        result: {
          text: aggregated,
          model,
          inputTokens,
          outputTokens,
          cachedTokens,
          latencyMs: Date.now() - startedAt,
        },
      };
    } catch (err) {
      this.logger.error("Anthropic stream failed", err as Error);
      yield {
        type: "error",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
