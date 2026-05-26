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
import { ShiftsService } from "./shifts.service";
import {
  CreateShiftDto,
  UpdateShiftDto,
  ShiftFiltersDto,
} from "../../dtos/shifts.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Shifts")
@ApiBearerAuth()
@Controller("shifts")
export class ShiftsController {
  constructor(@Inject(ShiftsService) private shiftsService: ShiftsService) {}

  @Get()
  @Roles([
    "beauty_advisor",
    "counter_manager",
    "area_manager",
    "national_retail_manager",
    "admin",
  ])
  findAll(@Query() filters: ShiftFiltersDto, @Session() session: UserSession) {
    return this.shiftsService.findAll(session.user, filters);
  }

  @Get("today")
  @Roles([
    "beauty_advisor",
    "counter_manager",
    "area_manager",
    "national_retail_manager",
    "admin",
  ])
  @ApiQuery({ name: "storeId", required: false, type: String })
  getToday(
    @Query("storeId") storeId: string | undefined,
    @Session() session: UserSession,
  ) {
    return this.shiftsService.getTodayRoster(session.user, { storeId });
  }

  @Post()
  @Roles(["counter_manager", "area_manager", "national_retail_manager", "admin"])
  @ApiBody({ type: CreateShiftDto })
  create(@Body() body: CreateShiftDto, @Session() session: UserSession) {
    return this.shiftsService.create(body, session.user);
  }

  @Patch(":id")
  @Roles(["counter_manager", "area_manager", "national_retail_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateShiftDto })
  update(
    @Param("id") id: string,
    @Body() body: UpdateShiftDto,
    @Session() session: UserSession,
  ) {
    return this.shiftsService.update(id, body, session.user);
  }

  @Delete(":id")
  @Roles(["counter_manager", "area_manager", "national_retail_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  remove(@Param("id") id: string, @Session() session: UserSession) {
    return this.shiftsService.remove(id, session.user);
  }
}
