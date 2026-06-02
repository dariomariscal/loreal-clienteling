import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Inject,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { RecommendationsService } from "./recommendations.service";
import { RecommendationEngineService } from "./services/recommendation-engine.service";
import {
  CreateRecommendationDto,
  AiRecommendationRequestDto,
  GenerateEngineRecommendationsDto,
} from "../../dtos/recommendations.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Recommendations")
@ApiBearerAuth()
@Controller()
export class RecommendationsController {
  constructor(
    @Inject(RecommendationsService)
    private readonly recommendationsService: RecommendationsService,
    @Inject(RecommendationEngineService)
    private readonly recommendationEngine: RecommendationEngineService,
  ) {}

  @Get("customers/:customerId/recommendations")
  @ApiParam({ name: "customerId", type: String })
  findByCustomer(
    @Param("customerId") customerId: string,
    @Session() session: UserSession,
  ) {
    return this.recommendationsService.findByCustomer(
      customerId,
      session.user,
    );
  }

  @Post("recommendations")
  @Roles(["beauty_advisor"])
  @ApiBody({ type: CreateRecommendationDto })
  create(
    @Body() body: CreateRecommendationDto,
    @Session() session: UserSession,
  ) {
    return this.recommendationsService.create(body, session.user);
  }

  /**
   * On-demand engine pass. The BA hits this from the customer profile to
   * fetch a fresh top-N product list with reason codes and WhatsApp drafts.
   * Persists by default so conversion attribution closes the loop.
   */
  @Post("recommendations/generate")
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiBody({ type: GenerateEngineRecommendationsDto })
  generate(
    @Body() body: GenerateEngineRecommendationsDto,
    @Session() session: UserSession,
  ) {
    const storeId = session.user.storeId;
    if (!storeId) {
      throw new BadRequestException(
        "User has no store assignment; cannot run recommendations.",
      );
    }
    return this.recommendationEngine.generateForCustomer({
      customerId: body.customerId,
      storeId,
      recommendedByUserId: session.user.id,
      limit: body.limit,
      withRationale: body.withRationale ?? true,
      persist: body.persist ?? true,
    });
  }

  @Post("recommendations/ai")
  @Roles(["beauty_advisor"])
  @ApiBody({ type: AiRecommendationRequestDto })
  requestAi(
    @Body() body: AiRecommendationRequestDto,
    @Session() session: UserSession,
  ) {
    return this.recommendationsService.requestAiRecommendation(
      body.customerId,
      body.context,
      session.user,
    );
  }

  @Patch("recommendations/:id/convert")
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiParam({ name: "id", type: String })
  markConverted(
    @Param("id") id: string,
    @Body("purchaseId") purchaseId: string,
  ) {
    return this.recommendationsService.markConverted(id, purchaseId);
  }
}
