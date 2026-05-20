import { Controller, Get, Post, Patch, Param, Body, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { StoresService } from "./stores.service";
import { CreateStoreDto, UpdateStoreDto } from "../../dtos/stores.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Stores")
@ApiBearerAuth()
@Controller("stores")
export class StoresController {
  constructor(@Inject(StoresService) private storesService: StoresService) {}

  @Get()
  findAll(@Session() session: UserSession) {
    return this.storesService.findAll(session.user);
  }

  @Get(":id")
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string) {
    return this.storesService.findOne(id);
  }

  @Post()
  @Roles(["admin"])
  @ApiBody({ type: CreateStoreDto })
  create(@Body() body: CreateStoreDto) {
    return this.storesService.create(body);
  }

  @Patch(":id")
  @Roles(["admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateStoreDto })
  update(@Param("id") id: string, @Body() body: UpdateStoreDto) {
    return this.storesService.update(id, body);
  }
}
