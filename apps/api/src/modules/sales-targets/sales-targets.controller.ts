import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Inject,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { SalesTargetsService } from "./sales-targets.service";
import {
  CreateSalesTargetDto,
  UpdateSalesTargetDto,
  SalesTargetFiltersDto,
} from "../../dtos/sales-targets.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Sales Targets")
@ApiBearerAuth()
@Controller("sales-targets")
export class SalesTargetsController {
  constructor(
    @Inject(SalesTargetsService) private salesTargetsService: SalesTargetsService,
  ) {}

  @Get()
  @Roles([
    "counter_manager",
    "area_manager",
    "national_retail_manager",
    "admin",
  ])
  findAll(
    @Query() filters: SalesTargetFiltersDto,
    @Session() session: UserSession,
  ) {
    return this.salesTargetsService.findAll(session.user, filters);
  }

  @Get("today")
  @Roles([
    "beauty_advisor",
    "counter_manager",
    "area_manager",
    "national_retail_manager",
    "admin",
  ])
  @ApiQuery({ name: "date", required: false, type: String, description: "YYYY-MM-DD; defaults to today" })
  @ApiQuery({ name: "storeId", required: false, type: String })
  @ApiQuery({ name: "brandId", required: false, type: String })
  getToday(
    @Query("date") date: string | undefined,
    @Query("storeId") storeId: string | undefined,
    @Query("brandId") brandId: string | undefined,
    @Session() session: UserSession,
  ) {
    return this.salesTargetsService.getTodayProgress(session.user, {
      date,
      storeId,
      brandId,
    });
  }

  @Post()
  @Roles([
    "counter_manager",
    "area_manager",
    "national_retail_manager",
    "admin",
  ])
  @ApiBody({ type: CreateSalesTargetDto })
  create(
    @Body() body: CreateSalesTargetDto,
    @Session() session: UserSession,
  ) {
    return this.salesTargetsService.create(body, session.user);
  }

  @Patch(":id")
  @Roles([
    "counter_manager",
    "area_manager",
    "national_retail_manager",
    "admin",
  ])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateSalesTargetDto })
  update(
    @Param("id") id: string,
    @Body() body: UpdateSalesTargetDto,
    @Session() session: UserSession,
  ) {
    return this.salesTargetsService.update(id, body, session.user);
  }

  @Delete(":id")
  @Roles([
    "counter_manager",
    "area_manager",
    "national_retail_manager",
    "admin",
  ])
  @ApiParam({ name: "id", type: String })
  remove(@Param("id") id: string, @Session() session: UserSession) {
    return this.salesTargetsService.remove(id, session.user);
  }
}
