import { Controller, Get, Post, Patch, Param, Body, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { ServiceTypesService } from "./service-types.service";
import {
  CreateServiceTypeDto,
  UpdateServiceTypeDto,
} from "../../dtos/service-types.dto";

@ApiTags("Service Types")
@ApiBearerAuth()
@Controller("service-types")
export class ServiceTypesController {
  constructor(
    @Inject(ServiceTypesService)
    private serviceTypesService: ServiceTypesService,
  ) {}

  @Get()
  findAll() {
    return this.serviceTypesService.findActive();
  }

  @Get("all")
  @Roles(["admin"])
  findAllIncludingInactive() {
    return this.serviceTypesService.findAll();
  }

  @Get(":id")
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string) {
    return this.serviceTypesService.findOne(id);
  }

  @Post()
  @Roles(["admin"])
  @ApiBody({ type: CreateServiceTypeDto })
  create(@Body() body: CreateServiceTypeDto) {
    return this.serviceTypesService.create(body);
  }

  @Patch(":id")
  @Roles(["admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateServiceTypeDto })
  update(@Param("id") id: string, @Body() body: UpdateServiceTypeDto) {
    return this.serviceTypesService.update(id, body);
  }
}
