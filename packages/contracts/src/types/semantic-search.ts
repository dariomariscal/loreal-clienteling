/**
 * Semantic + lexical search across customers. The `type` field decides which
 * scoring strategy the backend uses; `semantic` is the AI-powered one.
 */
export interface SemanticSearchQuery {
  query: string;
  limit?: number;
}

export interface SemanticSearchResult {
  customerId: string;
  firstName: string;
  lastName: string;
  matchedOn: "name" | "phone" | "email" | "notes" | "semantic";
  /** Cosine similarity 0..1 when matchedOn === "semantic"; otherwise null. */
  similarity: number | null;
  /** Short rationale shown under the result row ("la señora del labial rojo"). */
  rationale?: string;
  lastContactAt?: Date | null;
  lifecycleSegment?: string;
}
