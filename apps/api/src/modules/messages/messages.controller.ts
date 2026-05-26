import { Controller, Get, Post, Patch, Param, Body, Query, Inject } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import { MessagesService } from "./messages.service";
import {
  CreateMessageDto,
  CreateTemplateDto,
  UpdateTemplateDto,
  UpdateTrackingDto,
} from "../../dtos/messages.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Messages")
@ApiBearerAuth()
@Controller()
export class MessagesController {
  constructor(@Inject(MessagesService) private messagesService: MessagesService) {}

  @Get("messages")
  @Roles(["beauty_advisor", "counter_manager", "admin"])
  findAll(@Session() session: UserSession) {
    return this.messagesService.findAll(session.user);
  }

  @Get("customers/:customerId/messages")
  @ApiParam({ name: "customerId", type: String })
  findByCustomer(
    @Param("customerId") customerId: string,
    @Session() session: UserSession,
  ) {
    return this.messagesService.findByCustomer(customerId, session.user);
  }

  @Post("messages")
  @Roles(["beauty_advisor", "counter_manager"])
  @ApiBody({ type: CreateMessageDto })
  create(@Body() body: CreateMessageDto, @Session() session: UserSession) {
    return this.messagesService.create(body, session.user);
  }

  @Get("messages/templates")
  @ApiQuery({
    name: "customerId",
    required: false,
    type: String,
    description:
      "When provided, only returns templates whose channel matches an active marketing consent for this customer.",
  })
  findTemplates(
    @Session() session: UserSession,
    @Query("customerId") customerId?: string,
  ) {
    return this.messagesService.findTemplates(session.user, { customerId });
  }

  @Post("messages/templates")
  @Roles(["admin", "counter_manager"])
  @ApiBody({ type: CreateTemplateDto })
  createTemplate(@Body() body: CreateTemplateDto) {
    return this.messagesService.createTemplate(body);
  }

  @Patch("messages/templates/:id")
  @Roles(["admin", "counter_manager"])
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateTemplateDto })
  updateTemplate(@Param("id") id: string, @Body() body: UpdateTemplateDto) {
    return this.messagesService.updateTemplate(id, body);
  }

  @Patch("messages/:id/tracking")
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateTrackingDto })
  updateTracking(@Param("id") id: string, @Body() body: UpdateTrackingDto) {
    return this.messagesService.updateTracking(id, {
      deliveredAt: body.deliveredAt,
      readAt: body.readAt,
      respondedAt: body.respondedAt,
    });
  }
}
