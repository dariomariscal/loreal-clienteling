import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationsRepo } from "./notifications.repo";
import { PushService } from "./push.service";
import { ReactiveNotificationListener } from "./listeners/reactive.listener";

/**
 * NotificationsModule owns the in-app + Web Push delivery for Beauty
 * Advisors. Exports `NotificationsService` so crons and other modules
 * can dispatch notifications directly (in addition to the event-driven
 * path via `@nestjs/event-emitter`).
 */
@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepo,
    PushService,
    ReactiveNotificationListener,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
