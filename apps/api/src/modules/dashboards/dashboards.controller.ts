import { Controller, Get, Query, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { DashboardsService } from "./dashboards.service";
import type { UserSession } from "../../common/types/session";

@ApiTags("Dashboards")
@ApiBearerAuth()
@Controller("dashboards")
export class DashboardsController {
  constructor(
    @Inject(DashboardsService) private dashboardsService: DashboardsService,
  ) {}

  @Get("counter/today")
  @Roles([
    "counter_manager",
    "area_manager",
    "national_retail_manager",
    "admin",
  ])
  @ApiQuery({ name: "storeId", required: false, type: String })
  @ApiQuery({ name: "brandId", required: false, type: String })
  @ApiQuery({ name: "date", required: false, type: String, description: "YYYY-MM-DD" })
  getCounterToday(
    @Query("storeId") storeId: string | undefined,
    @Query("brandId") brandId: string | undefined,
    @Query("date") date: string | undefined,
    @Session() session: UserSession,
  ) {
    return this.dashboardsService.getCounterToday(session.user, {
      storeId,
      brandId,
      date,
    });
  }
}
