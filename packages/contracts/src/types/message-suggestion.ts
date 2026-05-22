/**
 * One of the three chips shown above the message input on a customer
 * conversation. The BA taps to load it into the input and edits before
 * sending — the chip is a draft, not an autopilot send.
 */
export interface MessageSuggestion {
  /** Stable identifier for analytics — what the LLM thought it was doing. */
  intent:
    | "follow_up"
    | "replenishment"
    | "new_product"
    | "life_event"
    | "win_back"
    | "thank_you"
    | "custom";
  text: string;
  /** Optional human-readable reason — surfaced as tooltip if the BA hovers. */
  rationale?: string;
}

export interface MessageSuggestionInput {
  customerFirstName: string;
  recentMessages: Array<{
    body: string;
    direction: "outbound" | "inbound";
    sentAt: Date;
  }>;
  customerContextSummary?: string;
  language?: string;
}
