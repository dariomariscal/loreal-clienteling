import { Controller, Get, Post, Patch, Param, Body, Query, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { AppointmentsService } from "./appointments.service";
import { CreateAppointmentDto, UpdateAppointmentDto } from "../../dtos/appointments.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Appointments")
@ApiBearerAuth()
@Controller("appointments")
export class AppointmentsController {
  constructor(@Inject(AppointmentsService) private appointmentsService: AppointmentsService) {}

  @Get()
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  findAll(
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Session() session: UserSession,
  ) {
    return this.appointmentsService.findAll(session.user, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get("calendar")
  @ApiQuery({ name: "from", type: String, required: true })
  @ApiQuery({ name: "to", type: String, required: true })
  @ApiQuery({ name: "baUserId", type: String, required: false })
  @ApiQuery({ name: "storeView", type: Boolean, required: false })
  getCalendar(
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("baUserId") baUserId: string | undefined,
    @Query("storeView") storeView: string | undefined,
    @Session() session: UserSession,
  ) {
    return this.appointmentsService.getCalendar(
      new Date(from),
      new Date(to),
      session.user,
      { baUserId, storeView: storeView === "true" },
    );
  }

  @Get("availability")
  @Roles(["ba", "manager", "supervisor", "admin"])
  @ApiQuery({ name: "baUserId", type: String, required: true })
  @ApiQuery({ name: "from", type: String, required: true, description: "ISO date or datetime" })
  @ApiQuery({ name: "to", type: String, required: true, description: "ISO date or datetime" })
  @ApiQuery({ name: "durationMinutes", type: Number, required: true })
  getAvailabilityDays(
    @Query("baUserId") baUserId: string,
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("durationMinutes") durationMinutes: string,
    @Session() session: UserSession,
  ) {
    return this.appointmentsService.getAvailabilityDays(session.user, {
      baUserId,
      from: new Date(from),
      to: new Date(to),
      durationMinutes: parseInt(durationMinutes, 10),
    });
  }

  @Get("availability/slots")
  @Roles(["ba", "manager", "supervisor", "admin"])
  @ApiQuery({ name: "baUserId", type: String, required: true })
  @ApiQuery({ name: "date", type: String, required: true, description: "ISO date (YYYY-MM-DD)" })
  @ApiQuery({ name: "durationMinutes", type: Number, required: true })
  getAvailabilitySlots(
    @Query("baUserId") baUserId: string,
    @Query("date") date: string,
    @Query("durationMinutes") durationMinutes: string,
    @Session() session: UserSession,
  ) {
    return this.appointmentsService.getAvailabilitySlots(session.user, {
      baUserId,
      date: new Date(date),
      durationMinutes: parseInt(durationMinutes, 10),
    });
  }

  @Get(":id")
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Post()
  @Roles(["ba", "manager"])
  @ApiBody({ type: CreateAppointmentDto })
  create(
    @Body() body: CreateAppointmentDto,
    @Session() session: UserSession,
  ) {
    return this.appointmentsService.create(body, session.user);
  }

  @Patch(":id")
  @Roles(["ba", "manager"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateAppointmentDto })
  update(
    @Param("id") id: string,
    @Body() body: UpdateAppointmentDto,
    @Session() session: UserSession,
  ) {
    return this.appointmentsService.update(id, body, session.user);
  }
}
