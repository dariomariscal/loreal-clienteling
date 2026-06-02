import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { SegmentationCron } from "./segmentation.cron";
import { LifecycleAlertsCron } from "./lifecycle-alerts.cron";
import { AppointmentRemindersCron } from "./appointment-reminders.cron";
import { AppointmentImminentCron } from "./appointment-imminent.cron";
import { DailySuggestedActionsCron } from "./daily-suggested-actions.cron";
import { ReservationExpiringCron } from "./reservation-expiring.cron";
import { WishlistWatcherCron } from "./wishlist-watcher.cron";
import { SampleFollowupCron } from "./sample-followup.cron";
import { AbandonedCartCron } from "./abandoned-cart.cron";
import { FollowupOverdueCron } from "./followup-overdue.cron";
import { AiModule } from "../ai/ai.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [ScheduleModule.forRoot(), AiModule, NotificationsModule],
  providers: [
    SegmentationCron,
    LifecycleAlertsCron,
    AppointmentRemindersCron,
    AppointmentImminentCron,
    DailySuggestedActionsCron,
    ReservationExpiringCron,
    WishlistWatcherCron,
    SampleFollowupCron,
    AbandonedCartCron,
    FollowupOverdueCron,
  ],
})
export class SchedulerModule {}
