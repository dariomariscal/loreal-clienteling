/**
 * Provider-agnostic embeddings contract. Today: OpenAI text-embedding-3-small.
 * Pluggable — Cohere, Voyage, self-hosted bge-* could implement this same
 * interface and be swapped via the module wiring.
 */

export interface EmbedOptions {
  /** Single string or array — implementations decide whether to batch. */
  input: string | string[];
}

export interface EmbedResult {
  /** Order matches the `input` array (or single-element array for single input). */
  vectors: number[][];
  model: string;
  inputTokens: number;
  latencyMs: number;
}

export interface EmbeddingsProvider {
  embed(options: EmbedOptions): Promise<EmbedResult>;
  /** Dimensionality of the vectors this provider produces. */
  readonly dimensions: number;
}

export const EMBEDDINGS_PROVIDER = "EMBEDDINGS_PROVIDER";
