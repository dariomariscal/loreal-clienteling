import { Controller, Get, Post, Patch, Param, Body, Query, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { AppointmentsService } from "./appointments.service";
import { CreateAppointmentDto, UpdateAppointmentDto } from "../../dtos/appointments.dto";
import type { UserSession } from "../../common/types/session";

/**
 * Parse a `YYYY-MM-DD` string as midnight in the server's local timezone.
 * `new Date(ymd)` parses the same string as UTC, which shifts the day in
 * any non-UTC zone (e.g. America/Mexico_City reads "2026-05-25" back as
 * 2026-05-24 18:00 local). For ISO instants ("…T…Z") fall back to the
 * standard parser so callers can still pass datetimes when they have them.
 */
function parseLocalYmd(s: string): Date {
  const ymdMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
  }
  return new Date(s);
}

@ApiTags("Appointments")
@ApiBearerAuth()
@Controller("appointments")
export class AppointmentsController {
  constructor(@Inject(AppointmentsService) private appointmentsService: AppointmentsService) {}

  @Get()
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  @ApiQuery({ name: "from", type: String, required: false })
  @ApiQuery({ name: "to", type: String, required: false })
  @ApiQuery({ name: "staffUserId", type: String, required: false })
  findAll(
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Query("staffUserId") staffUserId: string | undefined,
    @Session() session: UserSession,
  ) {
    return this.appointmentsService.findAll(session.user, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      staffUserId,
    });
  }

  @Get("calendar")
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  @ApiQuery({ name: "from", type: String, required: true })
  @ApiQuery({ name: "to", type: String, required: true })
  @ApiQuery({ name: "staffUserId", type: String, required: false })
  @ApiQuery({ name: "storeView", type: Boolean, required: false })
  getCalendar(
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("staffUserId") staffUserId: string | undefined,
    @Query("storeView") storeView: string | undefined,
    @Session() session: UserSession,
  ) {
    return this.appointmentsService.getCalendar(
      new Date(from),
      new Date(to),
      session.user,
      { staffUserId, storeView: storeView === "true" },
    );
  }

  @Get("availability")
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  @ApiQuery({ name: "staffUserId", type: String, required: true })
  @ApiQuery({ name: "from", type: String, required: true, description: "ISO date or datetime" })
  @ApiQuery({ name: "to", type: String, required: true, description: "ISO date or datetime" })
  @ApiQuery({ name: "durationMinutes", type: Number, required: true })
  getAvailabilityDays(
    @Query("staffUserId") staffUserId: string,
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("durationMinutes") durationMinutes: string,
    @Session() session: UserSession,
  ) {
    return this.appointmentsService.getAvailabilityDays(session.user, {
      staffUserId,
      from: parseLocalYmd(from),
      to: parseLocalYmd(to),
      durationMinutes: parseInt(durationMinutes, 10),
    });
  }

  @Get("availability/slots")
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  @ApiQuery({ name: "staffUserId", type: String, required: true })
  @ApiQuery({ name: "date", type: String, required: true, description: "ISO date (YYYY-MM-DD)" })
  @ApiQuery({ name: "durationMinutes", type: Number, required: true })
  getAvailabilitySlots(
    @Query("staffUserId") staffUserId: string,
    @Query("date") date: string,
    @Query("durationMinutes") durationMinutes: string,
    @Session() session: UserSession,
  ) {
    return this.appointmentsService.getAvailabilitySlots(session.user, {
      staffUserId,
      // Parse YYYY-MM-DD as a *local* date, not UTC. `new Date("2026-05-25")`
      // would be parsed as 2026-05-25T00:00 UTC, which is 2026-05-24 18:00 in
      // America/Mexico_City — the slot builder then generates slots for the
      // previous day and filters them all as "already passed".
      date: parseLocalYmd(date),
      durationMinutes: parseInt(durationMinutes, 10),
    });
  }

  @Get(":id")
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Post()
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiBody({ type: CreateAppointmentDto })
  create(
    @Body() body: CreateAppointmentDto,
    @Session() session: UserSession,
  ) {
    return this.appointmentsService.create(body, session.user);
  }

  @Patch(":id")
  @Roles(["beauty_advisor", "counter_manager"])
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
