import { Controller, Get, Param, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { RetailGroupsService } from "./retail-groups.service";

@ApiTags("Retail Groups")
@ApiBearerAuth()
@Controller("retail-groups")
@Roles(["beauty_advisor", "counter_manager", "area_manager", "national_retail_manager", "admin"])
export class RetailGroupsController {
  constructor(
    @Inject(RetailGroupsService) private retailGroupsService: RetailGroupsService,
  ) {}

  @Get()
  listAll() {
    return this.retailGroupsService.listAll();
  }

  @Get("banners")
  listBanners() {
    return this.retailGroupsService.listBanners();
  }

  @Get("retailers")
  listRetailers() {
    return this.retailGroupsService.listRetailers();
  }

  @Get(":id")
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string) {
    return this.retailGroupsService.findOne(id);
  }

  @Get(":id/stores")
  @ApiParam({ name: "id", type: String })
  storesInGroup(@Param("id") id: string) {
    return this.retailGroupsService.storesInGroup(id);
  }
}
