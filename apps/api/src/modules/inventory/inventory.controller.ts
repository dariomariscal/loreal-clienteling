import { Controller, Get, Query, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { InventoryService } from "./inventory.service";
import { InventoryAlertsFiltersDto } from "../../dtos/inventory.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Inventory")
@ApiBearerAuth()
@Controller("inventory")
export class InventoryController {
  constructor(@Inject(InventoryService) private inventoryService: InventoryService) {}

  @Get("alerts")
  @Roles([
    "beauty_advisor",
    "counter_manager",
    "area_manager",
    "national_retail_manager",
    "admin",
  ])
  getAlerts(
    @Query() filters: InventoryAlertsFiltersDto,
    @Session() session: UserSession,
  ) {
    return this.inventoryService.getAlerts(session.user, filters);
  }
}
