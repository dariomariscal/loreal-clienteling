import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { SegmentationCron } from "./segmentation.cron";
import { LifecycleAlertsCron } from "./lifecycle-alerts.cron";
import { AppointmentRemindersCron } from "./appointment-reminders.cron";
import { DailyOpportunitiesCron } from "./daily-opportunities.cron";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [ScheduleModule.forRoot(), AiModule],
  providers: [
    SegmentationCron,
    LifecycleAlertsCron,
    AppointmentRemindersCron,
    DailyOpportunitiesCron,
  ],
})
export class SchedulerModule {}
