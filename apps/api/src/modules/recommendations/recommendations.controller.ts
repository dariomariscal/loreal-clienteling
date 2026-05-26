import { Controller, Get, Post, Patch, Param, Body, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { RecommendationsService } from "./recommendations.service";
import { CreateRecommendationDto, AiRecommendationRequestDto } from "../../dtos/recommendations.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Recommendations")
@ApiBearerAuth()
@Controller()
export class RecommendationsController {
  constructor(@Inject(RecommendationsService) private recommendationsService: RecommendationsService) {}

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
