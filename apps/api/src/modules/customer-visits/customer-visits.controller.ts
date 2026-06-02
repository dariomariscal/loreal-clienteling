import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Inject,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { CustomerVisitsService } from "./customer-visits.service";
import {
  StartVisitDto,
  UpdateVisitDto,
  CloseVisitDto,
  AbandonVisitDto,
} from "../../dtos/customer-visits.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Customer Visits")
@ApiBearerAuth()
@Controller()
export class CustomerVisitsController {
  constructor(
    @Inject(CustomerVisitsService)
    private visitsService: CustomerVisitsService,
  ) {}

  @Get("customer-visits")
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "national_retail_manager", "admin"])
  @ApiQuery({ name: "customerId", type: String, required: false })
  @ApiQuery({ name: "storeId", type: String, required: false })
  @ApiQuery({ name: "attendedByUserId", type: String, required: false })
  @ApiQuery({ name: "status", type: String, required: false })
  @ApiQuery({ name: "visitReason", type: String, required: false })
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  findAll(
    @Query("customerId") customerId: string | undefined,
    @Query("storeId") storeId: string | undefined,
    @Query("attendedByUserId") attendedByUserId: string | undefined,
    @Query("status") status: string | undefined,
    @Query("visitReason") visitReason: string | undefined,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Session() session: UserSession,
  ) {
    return this.visitsService.findAll(session.user, {
      customerId,
      storeId,
      attendedByUserId,
      status,
      visitReason,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get("customers/:customerId/visits")
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "national_retail_manager", "admin"])
  @ApiParam({ name: "customerId", type: String })
  findByCustomer(
    @Param("customerId") customerId: string,
    @Session() session: UserSession,
  ) {
    return this.visitsService.findByCustomer(customerId, session.user);
  }

  @Get("customer-visits/:id")
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string) {
    return this.visitsService.findOne(id);
  }

  @Post("customer-visits")
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiBody({ type: StartVisitDto })
  start(@Body() body: StartVisitDto, @Session() session: UserSession) {
    return this.visitsService.start(body, session.user);
  }

  @Patch("customer-visits/:id")
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateVisitDto })
  update(
    @Param("id") id: string,
    @Body() body: UpdateVisitDto,
    @Session() session: UserSession,
  ) {
    return this.visitsService.update(id, body, session.user);
  }

  @Post("customer-visits/:id/close")
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: CloseVisitDto })
  close(
    @Param("id") id: string,
    @Body() body: CloseVisitDto,
    @Session() session: UserSession,
  ) {
    return this.visitsService.close(id, body, session.user);
  }

  @Post("customer-visits/:id/abandon")
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: AbandonVisitDto })
  abandon(
    @Param("id") id: string,
    @Body() body: AbandonVisitDto,
    @Session() session: UserSession,
  ) {
    return this.visitsService.abandon(id, body, session.user);
  }
}
