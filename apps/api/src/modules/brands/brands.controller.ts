import { Controller, Get, Post, Patch, Put, Param, Body, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { BrandsService } from "./brands.service";
import { CreateBrandDto, UpdateBrandDto, UpsertBrandConfigDto } from "../../dtos/brands.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Brands")
@ApiBearerAuth()
@Controller("brands")
export class BrandsController {
  constructor(@Inject(BrandsService) private brandsService: BrandsService) {}

  @Get()
  findAll(@Session() session: UserSession) {
    return this.brandsService.findAll(session.user);
  }

  @Get(":id")
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string) {
    return this.brandsService.findOne(id);
  }

  @Post()
  @Roles(["national_retail_manager", "admin"])
  @ApiBody({ type: CreateBrandDto })
  create(@Body() body: CreateBrandDto, @Session() session: UserSession) {
    return this.brandsService.create(body, session.user);
  }

  @Patch(":id")
  @Roles(["national_retail_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateBrandDto })
  update(
    @Param("id") id: string,
    @Body() body: UpdateBrandDto,
    @Session() session: UserSession,
  ) {
    return this.brandsService.update(id, body, session.user);
  }

  @Put(":id/config")
  @Roles(["national_retail_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpsertBrandConfigDto })
  upsertConfig(
    @Param("id") id: string,
    @Body() body: UpsertBrandConfigDto,
    @Session() session: UserSession,
  ) {
    return this.brandsService.upsertConfig(id, body, session.user);
  }
}
