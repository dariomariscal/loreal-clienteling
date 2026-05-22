/**
 * USD per 1M tokens, by model. Keep in one place so the cost columns in
 * ai_usage_logs stay consistent and easy to audit. Update when provider
 * pricing changes.
 *
 * Anthropic prompt-caching: cached input tokens are billed at 10% of the
 * base input rate (read) on Sonnet 4.5. We approximate that here.
 */
const PRICING_PER_MILLION_USD: Record<
  string,
  { input: number; output: number; cachedRead?: number }
> = {
  "claude-sonnet-4-5-20250929": { input: 3, output: 15, cachedRead: 0.3 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5, cachedRead: 0.1 },
  "text-embedding-3-small": { input: 0.02, output: 0 },
};

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedTokens = 0,
): number {
  const price = PRICING_PER_MILLION_USD[model];
  if (!price) return 0;
  const freshInput = Math.max(inputTokens - cachedTokens, 0);
  const cachedCost = (cachedTokens * (price.cachedRead ?? price.input)) / 1_000_000;
  const freshCost = (freshInput * price.input) / 1_000_000;
  const outCost = (outputTokens * price.output) / 1_000_000;
  return freshCost + cachedCost + outCost;
}
