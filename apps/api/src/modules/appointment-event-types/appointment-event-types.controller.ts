import { Controller, Get, Post, Patch, Param, Body, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { AppointmentEventTypesService } from "./appointment-event-types.service";
import {
  CreateAppointmentEventTypeDto,
  UpdateAppointmentEventTypeDto,
} from "../../dtos/appointment-event-types.dto";

@ApiTags("Appointment Event Types")
@ApiBearerAuth()
@Controller("appointment-event-types")
export class AppointmentEventTypesController {
  constructor(
    @Inject(AppointmentEventTypesService)
    private eventTypesService: AppointmentEventTypesService,
  ) {}

  @Get()
  findAll() {
    return this.eventTypesService.findActive();
  }

  @Get("all")
  @Roles(["admin"])
  findAllIncludingInactive() {
    return this.eventTypesService.findAll();
  }

  @Get(":id")
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string) {
    return this.eventTypesService.findOne(id);
  }

  @Post()
  @Roles(["admin"])
  @ApiBody({ type: CreateAppointmentEventTypeDto })
  create(@Body() body: CreateAppointmentEventTypeDto) {
    return this.eventTypesService.create(body);
  }

  @Patch(":id")
  @Roles(["admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateAppointmentEventTypeDto })
  update(@Param("id") id: string, @Body() body: UpdateAppointmentEventTypeDto) {
    return this.eventTypesService.update(id, body);
  }
}
