import { Controller, Get, Post, Patch, Param, Body, Inject, Query, BadRequestException } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { ZonesService } from "./zones.service";
import { CreateZoneDto, UpdateZoneDto } from "../../dtos/zones.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Zones")
@ApiBearerAuth()
@Controller("zones")
export class ZonesController {
  constructor(@Inject(ZonesService) private zonesService: ZonesService) {}

  @Get()
  @Roles(["admin", "area_manager"])
  findAll(@Session() session: UserSession) {
    return this.zonesService.findAll(session.user);
  }

  @Get("by-point")
  @Roles(["admin", "area_manager", "counter_manager", "beauty_advisor"])
  @ApiQuery({ name: "lat", type: Number })
  @ApiQuery({ name: "lng", type: Number })
  findByPoint(@Query("lat") lat: string, @Query("lng") lng: string) {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      throw new BadRequestException("lat and lng must be numbers");
    }
    return this.zonesService.findByPoint(latNum, lngNum);
  }

  @Get(":id")
  @Roles(["admin", "area_manager"])
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string) {
    return this.zonesService.findOne(id);
  }

  @Post()
  @Roles(["admin"])
  @ApiBody({ type: CreateZoneDto })
  create(@Body() body: CreateZoneDto) {
    return this.zonesService.create(body);
  }

  @Patch(":id")
  @Roles(["admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateZoneDto })
  update(@Param("id") id: string, @Body() body: UpdateZoneDto) {
    return this.zonesService.update(id, body);
  }
}
