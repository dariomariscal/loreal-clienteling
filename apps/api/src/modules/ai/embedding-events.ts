/**
 * Events that signal an embedding may be stale. Producers fire them on any
 * write that materially changes the entity's identity (beauty profile, new
 * order, new note). The AI module's listener re-runs the embedding
 * fire-and-forget; consumers never wait on it.
 *
 * Kept separate from `notification-events.ts` because embeddings are not a
 * user-facing notification concern — they're an AI gateway concern.
 */
export const EmbeddingEvents = {
  /** Customer profile, beauty data, orders, notes or visits changed. */
  CUSTOMER_CHANGED: "embeddings.customer_changed",
} as const;

export type EmbeddingEventName =
  (typeof EmbeddingEvents)[keyof typeof EmbeddingEvents];

export interface CustomerChangedEvent {
  customerId: string;
  /** Free-form reason ("created", "updated", "order_created", "note_added").
   *  Used only for telemetry/logging. */
  reason: string;
}
