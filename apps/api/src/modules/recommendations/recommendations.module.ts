import { Module, forwardRef } from "@nestjs/common";
import { RecommendationsController } from "./recommendations.controller";
import { RecommendationsService } from "./recommendations.service";
import { RecommendationEngineService } from "./services/recommendation-engine.service";
import { RecommendationsRepository } from "./repositories/recommendations.repository";
import { CustomerPreferencesRepository } from "./repositories/customer-preferences.repository";
import { SemanticMatchSource } from "./sources/semantic-match.source";
import { LookalikePurchaseSource } from "./sources/lookalike-purchase.source";
import { ReplenishmentDueSource } from "./sources/replenishment-due.source";
import { AiModule } from "../ai/ai.module";

/**
 * Recommendations module — owns both:
 *  - The "manual" flow (BA creates a recommendation by hand) via
 *    {@link RecommendationsService}.
 *  - The engine flow (multi-signal pipeline) via
 *    {@link RecommendationEngineService}.
 *
 * Signal sources are registered as Nest providers so they can be unit-tested
 * in isolation and so new sources can be added without touching the engine.
 */
@Module({
  imports: [forwardRef(() => AiModule)],
  controllers: [RecommendationsController],
  providers: [
    RecommendationsService,
    RecommendationsRepository,
    CustomerPreferencesRepository,
    SemanticMatchSource,
    LookalikePurchaseSource,
    ReplenishmentDueSource,
    RecommendationEngineService,
  ],
  exports: [RecommendationsService, RecommendationEngineService],
})
export class RecommendationsModule {}
