import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Inject,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { ApprovalRequestsService } from "./approval-requests.service";
import {
  CreateApprovalRequestDto,
  DecideApprovalRequestDto,
  ApprovalRequestFiltersDto,
} from "../../dtos/approval-requests.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Approvals")
@ApiBearerAuth()
@Controller("approvals")
export class ApprovalRequestsController {
  constructor(
    @Inject(ApprovalRequestsService)
    private approvalRequestsService: ApprovalRequestsService,
  ) {}

  @Get()
  @Roles([
    "beauty_advisor",
    "counter_manager",
    "area_manager",
    "national_retail_manager",
    "admin",
  ])
  findAll(
    @Query() filters: ApprovalRequestFiltersDto,
    @Session() session: UserSession,
  ) {
    return this.approvalRequestsService.findAll(session.user, filters);
  }

  @Get(":id")
  @Roles([
    "beauty_advisor",
    "counter_manager",
    "area_manager",
    "national_retail_manager",
    "admin",
  ])
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string, @Session() session: UserSession) {
    return this.approvalRequestsService.findOne(id, session.user);
  }

  @Post()
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiBody({ type: CreateApprovalRequestDto })
  create(
    @Body() body: CreateApprovalRequestDto,
    @Session() session: UserSession,
  ) {
    return this.approvalRequestsService.create(body, session.user);
  }

  @Post(":id/decision")
  @Roles(["counter_manager", "area_manager", "national_retail_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: DecideApprovalRequestDto })
  decide(
    @Param("id") id: string,
    @Body() body: DecideApprovalRequestDto,
    @Session() session: UserSession,
  ) {
    return this.approvalRequestsService.decide(id, body, session.user);
  }

  @Post(":id/cancel")
  @Roles([
    "beauty_advisor",
    "counter_manager",
    "area_manager",
    "national_retail_manager",
    "admin",
  ])
  @ApiParam({ name: "id", type: String })
  cancel(@Param("id") id: string, @Session() session: UserSession) {
    return this.approvalRequestsService.cancel(id, session.user);
  }
}
