/**
 * Provider-agnostic LLM contract. Implementations (Anthropic today, Bedrock
 * or OpenAI tomorrow) live in sibling files and are wired through the module.
 * Everything beyond this file talks only to the interface.
 */

export interface LlmGenerateOptions {
  system: string;
  user: string;
  /** Logical task name for telemetry — "customer_summary", "note_extraction"... */
  feature: string;
  /** Override the default model for this provider for a single call. */
  modelOverride?: string;
  maxOutputTokens?: number;
  /** Stop sequences passed to the LLM if it supports them. */
  stopSequences?: string[];
  /** Sampling temperature 0..1. */
  temperature?: number;
}

export interface LlmGenerateResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  latencyMs: number;
}

export interface LlmStreamChunk {
  type: "text" | "done" | "error";
  delta?: string;
  /** Only on type === "done". */
  result?: LlmGenerateResult;
  /** Only on type === "error". */
  error?: string;
}

export interface LlmProvider {
  /** One-shot generation. Resolves with the full response. */
  generate(options: LlmGenerateOptions): Promise<LlmGenerateResult>;

  /** Streaming generation. Yields partial text deltas, ends with `done`. */
  stream(options: LlmGenerateOptions): AsyncIterable<LlmStreamChunk>;
}

export const LLM_PROVIDER = "LLM_PROVIDER";
