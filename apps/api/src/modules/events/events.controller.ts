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
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { EventsService } from "./events.service";
import {
  CreateEventDto,
  CreateMultiStoreEventDto,
  UpdateEventDto,
  ListEventsQueryDto,
  InviteCustomerDto,
  InviteCustomersDto,
  UpdateRsvpDto,
  AssignBaToEventDto,
} from "../../dtos/events.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Events")
@ApiBearerAuth()
@Controller("events")
export class EventsController {
  constructor(@Inject(EventsService) private eventsService: EventsService) {}

  @Get()
  list(@Query() query: ListEventsQueryDto, @Session() session: UserSession) {
    return this.eventsService.list(query, session.user);
  }

  @Get(":id")
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string, @Session() session: UserSession) {
    return this.eventsService.findOne(id, session.user);
  }

  @Post()
  @Roles(["counter_manager", "area_manager", "admin"])
  @ApiBody({ type: CreateEventDto })
  create(@Body() body: CreateEventDto, @Session() session: UserSession) {
    return this.eventsService.create(body, session.user);
  }

  @Post("multi")
  @Roles(["area_manager", "national_retail_manager", "admin"])
  @ApiBody({ type: CreateMultiStoreEventDto })
  createMultiStore(
    @Body() body: CreateMultiStoreEventDto,
    @Session() session: UserSession,
  ) {
    return this.eventsService.createMultiStore(body, session.user);
  }

  @Patch(":id")
  @Roles(["counter_manager", "area_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateEventDto })
  update(
    @Param("id") id: string,
    @Body() body: UpdateEventDto,
    @Session() session: UserSession,
  ) {
    return this.eventsService.update(id, body, session.user);
  }

  @Delete(":id")
  @Roles(["counter_manager", "area_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  remove(@Param("id") id: string, @Session() session: UserSession) {
    return this.eventsService.remove(id, session.user);
  }

  @Get(":id/invitees")
  @ApiParam({ name: "id", type: String })
  listInvitees(@Param("id") id: string, @Session() session: UserSession) {
    return this.eventsService.listInvitees(id, session.user);
  }

  @Post(":id/invitees")
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: InviteCustomerDto })
  invite(
    @Param("id") id: string,
    @Body() body: InviteCustomerDto,
    @Session() session: UserSession,
  ) {
    return this.eventsService.invite(id, body, session.user);
  }

  @Post(":id/invitees/bulk")
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: InviteCustomersDto })
  inviteBulk(
    @Param("id") id: string,
    @Body() body: InviteCustomersDto,
    @Session() session: UserSession,
  ) {
    return this.eventsService.inviteBulk(id, body, session.user);
  }

  @Patch(":id/invitees/:invitationId/rsvp")
  @ApiParam({ name: "id", type: String })
  @ApiParam({ name: "invitationId", type: String })
  @ApiBody({ type: UpdateRsvpDto })
  updateRsvp(
    @Param("id") id: string,
    @Param("invitationId") invitationId: string,
    @Body() body: UpdateRsvpDto,
    @Session() session: UserSession,
  ) {
    return this.eventsService.updateRsvp(id, invitationId, body, session.user);
  }

  @Post(":id/invitees/:invitationId/attended")
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  @ApiParam({ name: "invitationId", type: String })
  markAttended(
    @Param("id") id: string,
    @Param("invitationId") invitationId: string,
    @Session() session: UserSession,
  ) {
    return this.eventsService.markAttended(id, invitationId, session.user);
  }

  @Delete(":id/invitees/:invitationId")
  @Roles(["beauty_advisor", "counter_manager", "area_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  @ApiParam({ name: "invitationId", type: String })
  removeInvitation(
    @Param("id") id: string,
    @Param("invitationId") invitationId: string,
    @Session() session: UserSession,
  ) {
    return this.eventsService.removeInvitation(id, invitationId, session.user);
  }

  @Get(":id/assignments")
  @ApiParam({ name: "id", type: String })
  listAssignments(@Param("id") id: string, @Session() session: UserSession) {
    return this.eventsService.listAssignments(id, session.user);
  }

  @Post(":id/assignments")
  @Roles(["counter_manager", "area_manager", "national_retail_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: AssignBaToEventDto })
  assignBa(
    @Param("id") id: string,
    @Body() body: AssignBaToEventDto,
    @Session() session: UserSession,
  ) {
    return this.eventsService.assignBa(id, body, session.user);
  }

  @Delete(":id/assignments/:assignmentId")
  @Roles(["counter_manager", "area_manager", "national_retail_manager", "admin"])
  @ApiParam({ name: "id", type: String })
  @ApiParam({ name: "assignmentId", type: String })
  unassignBa(
    @Param("id") id: string,
    @Param("assignmentId") assignmentId: string,
    @Session() session: UserSession,
  ) {
    return this.eventsService.unassignBa(id, assignmentId, session.user);
  }
}
