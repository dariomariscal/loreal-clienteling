export {
  calculateSegment,
  type SegmentationInput,
  type SegmentationResult,
} from "./customer-segmentation/calculate-segment";

export {
  calculateNextPurchase,
  type ReplenishmentInput,
  type ReplenishmentResult,
  type PurchaseRecord,
} from "./replenishment/calculate-next-purchase";

export {
  attributePurchaseToBa,
  type AttributionInput,
  type AttributionResult,
  type RecommendationRecord,
} from "./attribution/attribute-purchase-to-ba";

export {
  generateLifeEventAlerts,
  type CustomerForAlerts,
  type LifeEventAlert,
} from "./lifecycle-events/generate-life-event-alerts";

export {
  findMatchingShades,
  type ShadeMatchInput,
  type ShadeMatchResult,
  type ShadeRecord,
} from "./shade-matching/find-matching-shades";

export {
  rankCustomerSearchResults,
  type CustomerSearchRecord,
  type SearchRankingInput,
  type RankedSearchResult,
} from "./search/rank-customer-search-results";

// AI — pure prompt builders, parsers and selectors. Framework-free so they
// can be unit-tested without an LLM, a network or a database.
export {
  buildCustomerSummaryPrompt,
  CUSTOMER_SUMMARY_PROMPT_VERSION,
  type CustomerSummaryPrompt,
} from "./ai-prompts/build-customer-summary-prompt";

export {
  buildNoteExtractionPrompt,
  NOTE_EXTRACTION_PROMPT_VERSION,
  type NoteExtractionPrompt,
} from "./ai-prompts/build-note-extraction-prompt";

export {
  buildMessageSuggestionPrompt,
  MESSAGE_SUGGESTION_PROMPT_VERSION,
  type MessageSuggestionPrompt,
} from "./ai-prompts/build-message-suggestion-prompt";

export {
  parseExtractedNote,
  type ParseExtractedNoteResult,
} from "./ai-extraction/parse-extracted-note";

export {
  selectDailyOpportunities,
  type SelectedOpportunity,
  type SelectDailyOpportunitiesInput,
} from "./daily-opportunities/select-daily-opportunities";

export {
  rankSemanticSearchResults,
  type RankSemanticSearchInput,
} from "./semantic-search/rank-semantic-search-results";
