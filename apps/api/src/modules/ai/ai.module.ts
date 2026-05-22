import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";

// Providers (interfaces + concrete implementations)
import { LLM_PROVIDER } from "./providers/llm.provider.interface";
import { TRANSCRIPTION_PROVIDER } from "./providers/transcription.provider.interface";
import { EMBEDDINGS_PROVIDER } from "./providers/embeddings.provider.interface";
import { AnthropicProvider } from "./providers/anthropic.provider";
import { DeepgramProvider } from "./providers/deepgram.provider";
import { OpenAiEmbeddingsProvider } from "./providers/openai-embeddings.provider";

// Repositories
import { CustomerAiSummariesRepository } from "./repositories/customer-ai-summaries.repository";
import { CustomerEmbeddingsRepository } from "./repositories/customer-embeddings.repository";
import { CustomerOpportunitiesRepository } from "./repositories/customer-opportunities.repository";
import { AiUsageLogsRepository } from "./repositories/ai-usage-logs.repository";

// Services
import { CustomerSummaryService } from "./services/customer-summary.service";
import { NoteExtractionService } from "./services/note-extraction.service";
import { MessageSuggestionService } from "./services/message-suggestion.service";
import { SemanticSearchService } from "./services/semantic-search.service";
import { DailyOpportunitiesService } from "./services/daily-opportunities.service";

/**
 * The AI module is the "AI Gateway" — the rest of the API talks only to the
 * services exported below. Concrete providers (Anthropic, Deepgram, OpenAI)
 * are bound through interface tokens so they can be swapped without touching
 * any consumer.
 */
@Module({
  controllers: [AiController],
  providers: [
    AnthropicProvider,
    DeepgramProvider,
    OpenAiEmbeddingsProvider,
    { provide: LLM_PROVIDER, useExisting: AnthropicProvider },
    { provide: TRANSCRIPTION_PROVIDER, useExisting: DeepgramProvider },
    { provide: EMBEDDINGS_PROVIDER, useExisting: OpenAiEmbeddingsProvider },

    CustomerAiSummariesRepository,
    CustomerEmbeddingsRepository,
    CustomerOpportunitiesRepository,
    AiUsageLogsRepository,

    CustomerSummaryService,
    NoteExtractionService,
    MessageSuggestionService,
    SemanticSearchService,
    DailyOpportunitiesService,
  ],
  exports: [
    CustomerSummaryService,
    NoteExtractionService,
    MessageSuggestionService,
    SemanticSearchService,
    DailyOpportunitiesService,
  ],
})
export class AiModule {}
