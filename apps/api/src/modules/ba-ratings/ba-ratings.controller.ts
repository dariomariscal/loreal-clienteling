import { Controller, Get, Post, Body, Query, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { BaRatingsService } from "./ba-ratings.service";
import {
  CreateBaRatingDto,
  BaNpsFiltersDto,
} from "../../dtos/ba-ratings.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("BA Ratings")
@ApiBearerAuth()
@Controller("ba-ratings")
export class BaRatingsController {
  constructor(
    @Inject(BaRatingsService) private baRatingsService: BaRatingsService,
  ) {}

  @Post()
  @Roles([
    "beauty_advisor",
    "counter_manager",
    "area_manager",
    "national_retail_manager",
    "admin",
  ])
  @ApiBody({ type: CreateBaRatingDto })
  create(@Body() body: CreateBaRatingDto, @Session() session: UserSession) {
    return this.baRatingsService.create(body, session.user);
  }

  @Get("nps")
  @Roles([
    "counter_manager",
    "area_manager",
    "national_retail_manager",
    "admin",
  ])
  getNpsByBa(
    @Query() filters: BaNpsFiltersDto,
    @Session() session: UserSession,
  ) {
    return this.baRatingsService.getNpsByBa(session.user, filters);
  }
}
