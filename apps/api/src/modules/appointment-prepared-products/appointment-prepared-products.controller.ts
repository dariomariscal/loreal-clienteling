import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Inject,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { AppointmentPreparedProductsService } from "./appointment-prepared-products.service";
import {
  AddPreparedProductDto,
  UpdatePreparedProductStatusDto,
} from "../../dtos/appointment-prepared-products.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Appointment Prepared Products")
@ApiBearerAuth()
@Controller("appointments/:appointmentId/prepared-products")
export class AppointmentPreparedProductsController {
  constructor(
    @Inject(AppointmentPreparedProductsService)
    private service: AppointmentPreparedProductsService,
  ) {}

  @Get()
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  @ApiParam({ name: "appointmentId", type: String })
  list(@Param("appointmentId") appointmentId: string) {
    return this.service.listForAppointment(appointmentId);
  }

  @Post()
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiParam({ name: "appointmentId", type: String })
  @ApiBody({ type: AddPreparedProductDto })
  add(
    @Param("appointmentId") appointmentId: string,
    @Body() body: AddPreparedProductDto,
    @Session() session: UserSession,
  ) {
    return this.service.add(appointmentId, body, session.user);
  }

  @Patch(":id")
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiParam({ name: "appointmentId", type: String })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdatePreparedProductStatusDto })
  updateStatus(
    @Param("id") id: string,
    @Body() body: UpdatePreparedProductStatusDto,
  ) {
    return this.service.updateStatus(id, body);
  }

  @Delete(":id")
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiParam({ name: "appointmentId", type: String })
  @ApiParam({ name: "id", type: String })
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
