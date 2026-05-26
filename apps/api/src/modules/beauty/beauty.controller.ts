import { Controller, Get, Put, Post, Param, Body, Query, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { BeautyService } from "./beauty.service";
import { UpsertBeautyProfileDto, CreateShadeMatchDto } from "../../dtos/beauty.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Beauty Profiles")
@ApiBearerAuth()
@Controller("customers/:customerId")
export class BeautyController {
  constructor(@Inject(BeautyService) private beautyService: BeautyService) {}

  @Get("beauty-profile")
  @ApiParam({ name: "customerId", type: String })
  findProfile(
    @Param("customerId") customerId: string,
    @Session() session: UserSession,
  ) {
    return this.beautyService.findProfile(customerId, session.user);
  }

  @Put("beauty-profile")
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiParam({ name: "customerId", type: String })
  @ApiBody({ type: UpsertBeautyProfileDto })
  upsertProfile(
    @Param("customerId") customerId: string,
    @Body() body: UpsertBeautyProfileDto,
    @Session() session: UserSession,
  ) {
    return this.beautyService.upsertProfile(
      { ...body, customerId },
      session.user,
    );
  }

  @Post("shades")
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiParam({ name: "customerId", type: String })
  @ApiBody({ type: CreateShadeMatchDto })
  addShade(
    @Param("customerId") customerId: string,
    @Body() body: CreateShadeMatchDto,
    @Session() session: UserSession,
  ) {
    return this.beautyService.addShade(body, customerId, session.user);
  }

  @Get("shade-matches")
  @ApiParam({ name: "customerId", type: String })
  @ApiQuery({ name: "category", type: String })
  @ApiQuery({ name: "brandId", type: String, required: false })
  getShadeMatches(
    @Param("customerId") customerId: string,
    @Query("category") category: string,
    @Query("brandId") brandId: string | undefined,
    @Session() session: UserSession,
  ) {
    return this.beautyService.getShadeMatches(
      customerId,
      category,
      brandId,
      session.user,
    );
  }
}
