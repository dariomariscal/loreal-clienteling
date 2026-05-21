import { Controller, Get, Post, Patch, Param, Body, Query, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { CommunicationsService } from "./communications.service";
import {
  CreateCommunicationDto,
  CreateTemplateDto,
  UpdateTemplateDto,
  UpdateTrackingDto,
} from "../../dtos/communications.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Communications")
@ApiBearerAuth()
@Controller()
export class CommunicationsController {
  constructor(@Inject(CommunicationsService) private communicationsService: CommunicationsService) {}

  @Get("communications")
  @Roles(["ba", "manager", "admin"])
  findAll(@Session() session: UserSession) {
    return this.communicationsService.findAll(session.user);
  }

  @Get("customers/:customerId/communications")
  @ApiParam({ name: "customerId", type: String })
  findByCustomer(
    @Param("customerId") customerId: string,
    @Session() session: UserSession,
  ) {
    return this.communicationsService.findByCustomer(customerId, session.user);
  }

  @Post("communications")
  @Roles(["ba", "manager"])
  @ApiBody({ type: CreateCommunicationDto })
  create(
    @Body() body: CreateCommunicationDto,
    @Session() session: UserSession,
  ) {
    return this.communicationsService.create(body, session.user);
  }

  @Get("communications/templates")
  @ApiQuery({
    name: "customerId",
    required: false,
    type: String,
    description: "When provided, only returns templates whose channel matches an active marketing consent for this customer.",
  })
  findTemplates(
    @Session() session: UserSession,
    @Query("customerId") customerId?: string,
  ) {
    return this.communicationsService.findTemplates(session.user, { customerId });
  }

  @Post("communications/templates")
  @Roles(["admin", "manager"])
  @ApiBody({ type: CreateTemplateDto })
  createTemplate(@Body() body: CreateTemplateDto) {
    return this.communicationsService.createTemplate(body);
  }

  @Patch("communications/templates/:id")
  @Roles(["admin", "manager"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateTemplateDto })
  updateTemplate(@Param("id") id: string, @Body() body: UpdateTemplateDto) {
    return this.communicationsService.updateTemplate(id, body);
  }

  @Patch("communications/:id/tracking")
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateTrackingDto })
  updateTracking(@Param("id") id: string, @Body() body: UpdateTrackingDto) {
    return this.communicationsService.updateTracking(id, {
      deliveredAt: body.deliveredAt,
      readAt: body.readAt,
      respondedAt: body.respondedAt,
    });
  }
}
