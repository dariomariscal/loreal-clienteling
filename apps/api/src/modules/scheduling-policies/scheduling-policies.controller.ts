import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
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
import { SchedulingPoliciesService } from "./scheduling-policies.service";
import {
  CreateSchedulingPolicyDto,
  UpdateSchedulingPolicyDto,
} from "../../dtos/scheduling-policies.dto";

@ApiTags("Scheduling Policies")
@ApiBearerAuth()
@Controller("scheduling-policies")
export class SchedulingPoliciesController {
  constructor(
    @Inject(SchedulingPoliciesService)
    private service: SchedulingPoliciesService,
  ) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get("effective")
  @ApiQuery({ name: "storeId", type: String, required: false })
  @ApiQuery({ name: "serviceTypeId", type: String, required: false })
  resolveEffective(
    @Query("storeId") storeId: string | undefined,
    @Query("serviceTypeId") serviceTypeId: string | undefined,
  ) {
    return this.service.resolveEffective({
      storeId: storeId ?? null,
      serviceTypeId: serviceTypeId ?? null,
    });
  }

  @Get(":id")
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(["counter_manager", "area_manager", "admin"])
  @ApiBody({ type: CreateSchedulingPolicyDto })
  create(@Body() body: CreateSchedulingPolicyDto) {
    return this.service.create(body);
  }

  @Patch(":id")
  @Roles(["counter_manager", "area_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateSchedulingPolicyDto })
  update(
    @Param("id") id: string,
    @Body() body: UpdateSchedulingPolicyDto,
  ) {
    return this.service.update(id, body);
  }

  @Delete(":id")
  @Roles(["area_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
