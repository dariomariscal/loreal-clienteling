import type { ProductSemanticSearchResult } from "@loreal/contracts";

export interface RankProductSearchInput {
  lexicalMatches: ProductSemanticSearchResult[];
  vectorMatches: ProductSemanticSearchResult[];
  limit?: number;
}

/**
 * Mirrors rankSemanticSearchResults but for products. Lexical matches (SKU,
 * name ILIKE) come first because the advisor usually knows what she typed;
 * vector matches fill the remainder by descending similarity. Pure.
 */
export function rankProductSearchResults(
  input: RankProductSearchInput,
): ProductSemanticSearchResult[] {
  const limit = input.limit ?? 10;
  const seen = new Set<string>();
  const out: ProductSemanticSearchResult[] = [];

  for (const r of input.lexicalMatches) {
    if (seen.has(r.productId)) continue;
    seen.add(r.productId);
    out.push(r);
    if (out.length >= limit) return out;
  }

  const sortedVector = [...input.vectorMatches].sort(
    (a, b) => (b.similarity ?? 0) - (a.similarity ?? 0),
  );
  for (const r of sortedVector) {
    if (seen.has(r.productId)) continue;
    seen.add(r.productId);
    out.push(r);
    if (out.length >= limit) return out;
  }

  return out;
}
