import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Inject,
} from "@nestjs/common";
import type { Request } from "express";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { CustomersService } from "./customers.service";
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  SearchCustomerDto,
  CustomerFiltersDto,
  RegisterCustomerDto,
  CheckDuplicateDto,
  ReassignCustomerDto,
} from "../../dtos/customers.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Customers")
@ApiBearerAuth()
@Controller("customers")
export class CustomersController {
  constructor(@Inject(CustomersService) private customersService: CustomersService) {}

  @Get()
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  findAll(
    @Query() filters: CustomerFiltersDto,
    @Session() session: UserSession,
  ) {
    return this.customersService.findAll(session.user, filters);
  }

  @Get("search")
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  search(
    @Query() query: SearchCustomerDto,
    @Session() session: UserSession,
  ) {
    return this.customersService.search(
      query.query,
      query.type,
      session.user,
    );
  }

  @Get("check-duplicate")
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  @ApiQuery({ name: "email", required: false, type: String })
  @ApiQuery({ name: "phone", required: false, type: String })
  checkDuplicate(
    @Query() query: CheckDuplicateDto,
    @Session() session: UserSession,
  ) {
    return this.customersService.checkDuplicate(query, session.user);
  }

  @Get(":id/metrics")
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  getMetrics(@Param("id") id: string, @Session() session: UserSession) {
    return this.customersService.getMetrics(id, session.user);
  }

  @Get(":id/activity")
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "before", required: false, type: String, description: "ISO timestamp cursor — return events strictly before this instant" })
  getActivity(
    @Param("id") id: string,
    @Query("limit") limit: string | undefined,
    @Query("before") before: string | undefined,
    @Session() session: UserSession,
  ) {
    return this.customersService.getActivity(id, session.user, {
      limit: limit ? Math.min(parseInt(limit, 10) || 20, 100) : 20,
      before: before ? new Date(before) : undefined,
    });
  }

  @Get(":id")
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string, @Session() session: UserSession) {
    return this.customersService.findOne(id, session.user);
  }

  @Post()
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  @ApiBody({ type: CreateCustomerDto })
  create(
    @Body() body: CreateCustomerDto,
    @Session() session: UserSession,
  ) {
    return this.customersService.create(body, session.user);
  }

  @Post("register")
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  @ApiBody({ type: RegisterCustomerDto })
  register(
    @Body() body: RegisterCustomerDto,
    @Session() session: UserSession,
    @Req() req: Request,
  ) {
    return this.customersService.register(body, session.user, {
      ipAddress:
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
        req.socket?.remoteAddress,
      userAgent: req.headers["user-agent"],
    });
  }

  @Patch(":id")
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateCustomerDto })
  update(
    @Param("id") id: string,
    @Body() body: UpdateCustomerDto,
    @Session() session: UserSession,
  ) {
    return this.customersService.update(id, body, session.user);
  }

  @Post(":id/reassign")
  @Roles(["counter_manager", "area_manager", "national_retail_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: ReassignCustomerDto })
  reassign(
    @Param("id") id: string,
    @Body() body: ReassignCustomerDto,
    @Session() session: UserSession,
  ) {
    return this.customersService.reassign(id, body, session.user);
  }

  @Delete(":id/arco")
  @Roles(["admin"])
  @ApiParam({ name: "id", type: String })
  executeRightToBeForgotten(
    @Param("id") id: string,
    @Body("requestFolio") requestFolio: string,
    @Session() session: UserSession,
  ) {
    return this.customersService.executeRightToBeForgotten(
      id,
      requestFolio,
      session.user,
    );
  }
}
