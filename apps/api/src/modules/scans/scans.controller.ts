import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  Inject,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { ScansService } from "./scans.service";
import { CreateScanEventDto } from "../../dtos/scan.dto";
import type { UserSession } from "../../common/types/session";

const BA_ROLES = [
  "beauty_advisor",
  "counter_manager",
  "area_manager",
  "admin",
] as const;

@ApiTags("Scans")
@ApiBearerAuth()
@Controller("scan-events")
export class ScansController {
  constructor(@Inject(ScansService) private scansService: ScansService) {}

  @Post()
  @Roles([...BA_ROLES])
  @ApiBody({ type: CreateScanEventDto })
  create(@Body() body: CreateScanEventDto, @Session() session: UserSession) {
    return this.scansService.create(body, session.user);
  }

  @Patch(":id/action")
  @Roles([...BA_ROLES])
  @ApiParam({ name: "id", type: String })
  setAction(
    @Param("id") id: string,
    @Body("actionTaken") actionTaken: string,
    @Session() session: UserSession,
  ) {
    return this.scansService.setAction(id, actionTaken, session.user);
  }

  @Get("today")
  @Roles([...BA_ROLES])
  today(@Session() session: UserSession) {
    return this.scansService.todayForUser(session.user);
  }
}
