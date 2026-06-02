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
import { AppointmentsService } from "./appointments.service";
import {
  CreateAppointmentDto,
  CreateAppointmentSeriesDto,
  UpdateAppointmentDto,
  CancelAppointmentDto,
  CancelAppointmentSeriesDto,
  MarkNoShowDto,
  ConfirmAppointmentByCustomerDto,
  CheckOutAppointmentDto,
} from "../../dtos/appointments.dto";
import type { UserSession } from "../../common/types/session";

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
  constructor(
    @Inject(AppointmentsService)
    private appointmentsService: AppointmentsService,
  ) {}

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
  @ApiQuery({
    name: "from",
    type: String,
    required: true,
    description: "ISO date or datetime",
  })
  @ApiQuery({
    name: "to",
    type: String,
    required: true,
    description: "ISO date or datetime",
  })
  @ApiQuery({ name: "durationMinutes", type: Number, required: true })
  @ApiQuery({ name: "serviceTypeId", type: String, required: false })
  getAvailabilityDays(
    @Query("staffUserId") staffUserId: string,
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("durationMinutes") durationMinutes: string,
    @Query("serviceTypeId") serviceTypeId: string | undefined,
    @Session() session: UserSession,
  ) {
    return this.appointmentsService.getAvailabilityDays(session.user, {
      staffUserId,
      from: parseLocalYmd(from),
      to: parseLocalYmd(to),
      durationMinutes: parseInt(durationMinutes, 10),
      serviceTypeId,
    });
  }

  @Get("availability/slots")
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  @ApiQuery({ name: "staffUserId", type: String, required: true })
  @ApiQuery({
    name: "date",
    type: String,
    required: true,
    description: "ISO date (YYYY-MM-DD)",
  })
  @ApiQuery({ name: "durationMinutes", type: Number, required: true })
  @ApiQuery({ name: "serviceTypeId", type: String, required: false })
  getAvailabilitySlots(
    @Query("staffUserId") staffUserId: string,
    @Query("date") date: string,
    @Query("durationMinutes") durationMinutes: string,
    @Query("serviceTypeId") serviceTypeId: string | undefined,
    @Session() session: UserSession,
  ) {
    return this.appointmentsService.getAvailabilitySlots(session.user, {
      staffUserId,
      date: parseLocalYmd(date),
      durationMinutes: parseInt(durationMinutes, 10),
      serviceTypeId,
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

  @Post("series")
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiBody({ type: CreateAppointmentSeriesDto })
  createSeries(
    @Body() body: CreateAppointmentSeriesDto,
    @Session() session: UserSession,
  ) {
    return this.appointmentsService.createSeries(body, session.user);
  }

  @Post(":id/cancel-series")
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: CancelAppointmentSeriesDto })
  cancelSeries(
    @Param("id") id: string,
    @Body() body: CancelAppointmentSeriesDto,
    @Session() session: UserSession,
  ) {
    return this.appointmentsService.cancelSeries(id, body, session.user);
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

  @Post(":id/cancel")
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: CancelAppointmentDto })
  cancel(
    @Param("id") id: string,
    @Body() body: CancelAppointmentDto,
    @Session() session: UserSession,
  ) {
    return this.appointmentsService.cancel(id, body, session.user);
  }

  @Post(":id/no-show")
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: MarkNoShowDto })
  noShow(@Param("id") id: string, @Body() body: MarkNoShowDto) {
    return this.appointmentsService.markNoShow(id, body);
  }

  @Post(":id/confirm")
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: ConfirmAppointmentByCustomerDto })
  confirm(
    @Param("id") id: string,
    @Body() body: ConfirmAppointmentByCustomerDto,
  ) {
    return this.appointmentsService.confirmByCustomer(id, body.confirmedAt);
  }

  @Post(":id/check-in")
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiParam({ name: "id", type: String })
  checkIn(@Param("id") id: string, @Session() session: UserSession) {
    return this.appointmentsService.checkIn(id, session.user);
  }

  @Post(":id/check-out")
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: CheckOutAppointmentDto })
  checkOut(
    @Param("id") id: string,
    @Body() body: CheckOutAppointmentDto,
    @Session() session: UserSession,
  ) {
    return this.appointmentsService.checkOut(id, body, session.user);
  }
}
