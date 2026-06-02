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
import { CustomerEmbeddingsRefreshCron } from "./customer-embeddings-refresh.cron";
import { AiModule } from "../ai/ai.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { RecommendationsModule } from "../recommendations/recommendations.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AiModule,
    NotificationsModule,
    RecommendationsModule,
  ],
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
    CustomerEmbeddingsRefreshCron,
  ],
})
export class SchedulerModule {}
