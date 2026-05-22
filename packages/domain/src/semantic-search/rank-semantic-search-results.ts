import type { SemanticSearchResult } from "@loreal/contracts";

export interface RankSemanticSearchInput {
  lexicalMatches: SemanticSearchResult[];
  vectorMatches: SemanticSearchResult[];
  limit?: number;
}

/**
 * Merge lexical and vector matches into a single ranked list. Pure.
 *
 * Strategy:
 * - Lexical matches (name / phone / email) are always returned first because
 *   they are deterministic and the BA usually knows what she typed.
 * - Vector matches fill the remaining slots, ordered by similarity desc.
 * - Duplicates (same customerId) are deduped, keeping the lexical version
 *   because its `matchedOn` is more informative for the UI.
 */
export function rankSemanticSearchResults(
  input: RankSemanticSearchInput,
): SemanticSearchResult[] {
  const limit = input.limit ?? 10;
  const seen = new Set<string>();
  const out: SemanticSearchResult[] = [];

  for (const r of input.lexicalMatches) {
    if (seen.has(r.customerId)) continue;
    seen.add(r.customerId);
    out.push(r);
    if (out.length >= limit) return out;
  }

  const sortedVector = [...input.vectorMatches].sort(
    (a, b) => (b.similarity ?? 0) - (a.similarity ?? 0),
  );
  for (const r of sortedVector) {
    if (seen.has(r.customerId)) continue;
    seen.add(r.customerId);
    out.push(r);
    if (out.length >= limit) return out;
  }

  return out;
}
