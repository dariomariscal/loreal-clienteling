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
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from "@nestjs/swagger";
import { Session } from "../../auth/decorators/session.decorator";
import { NotificationsService } from "./notifications.service";
import {
  ListNotificationsQueryDto,
  UpsertNotificationPreferenceDto,
  CreatePushSubscriptionDto,
} from "../../dtos/notifications.dto";
import type { UserSession } from "../../common/types/session";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(
    @Inject(NotificationsService)
    private notifications: NotificationsService,
  ) {}

  @Get()
  list(
    @Query() query: ListNotificationsQueryDto,
    @Session() session: UserSession,
  ) {
    return this.notifications.list(query, session.user);
  }

  @Get("unread-count")
  unreadCount(@Session() session: UserSession) {
    return this.notifications.unreadCount(session.user);
  }

  @Patch(":id/read")
  @ApiParam({ name: "id", type: String })
  markRead(@Param("id") id: string, @Session() session: UserSession) {
    return this.notifications.markRead(id, session.user);
  }

  @Post("mark-all-read")
  @HttpCode(HttpStatus.OK)
  markAllRead(@Session() session: UserSession) {
    return this.notifications.markAllRead(session.user);
  }

  @Patch(":id/dismiss")
  @ApiParam({ name: "id", type: String })
  dismiss(@Param("id") id: string, @Session() session: UserSession) {
    return this.notifications.dismiss(id, session.user);
  }

  // ─── Preferences ──────────────────────────────────────────────────────

  @Get("preferences")
  listPreferences(@Session() session: UserSession) {
    return this.notifications.listPreferences(session.user);
  }

  @Patch("preferences")
  @ApiBody({ type: UpsertNotificationPreferenceDto })
  upsertPreference(
    @Body() body: UpsertNotificationPreferenceDto,
    @Session() session: UserSession,
  ) {
    return this.notifications.upsertPreference(body, session.user);
  }

  // ─── Push subscriptions ───────────────────────────────────────────────

  @Get("push/vapid-public-key")
  vapidPublicKey() {
    return this.notifications.getVapidPublicKey();
  }

  @Post("push/subscriptions")
  @ApiBody({ type: CreatePushSubscriptionDto })
  subscribePush(
    @Body() body: CreatePushSubscriptionDto,
    @Session() session: UserSession,
  ) {
    return this.notifications.subscribePush(body, session.user);
  }

  @Delete("push/subscriptions/:id")
  @ApiParam({ name: "id", type: String })
  unsubscribePush(@Param("id") id: string, @Session() session: UserSession) {
    return this.notifications.unsubscribePush(id, session.user);
  }
}
