import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DailySuggestedActionsService } from "../ai/services/daily-suggested-actions.service";
import { NotificationsService } from "../notifications/notifications.service";

/**
 * Pre-computes the "hoy importan estas 5 clientas" queue every morning so
 * the home screen renders without any LLM call at request time. Runs after
 * SegmentationCron (2am) and LifecycleAlertsCron so the inputs it consumes
 * are already fresh.
 *
 * After computing, fans out a `daily_actions_ready` notification to every
 * BA that actually got at least one suggested action — BAs with an empty
 * queue stay silent to avoid morning noise.
 */
@Injectable()
export class DailySuggestedActionsCron {
  private readonly logger = new Logger(DailySuggestedActionsCron.name);

  constructor(
    private readonly dailySuggestedActionsService: DailySuggestedActionsService,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async computeDailySuggestedActions(): Promise<void> {
    const dueDate = new Date().toISOString().slice(0, 10);
    this.logger.log(`Computing daily suggested actions for ${dueDate}...`);

    const result =
      await this.dailySuggestedActionsService.computeForDate(dueDate);

    this.logger.log(
      `Daily suggested actions computed for ${result.basProcessed} BAs (${dueDate})`,
    );

    let dispatched = 0;
    for (const baId of result.basWithActions) {
      try {
        const inserted = await this.notifications.create({
          recipientUserId: baId,
          kind: "daily_actions_ready",
          title: "Tus tareas del día están listas",
          body: "Tu queue de seguimientos sugeridos para hoy ya está disponible.",
          actionUrl: "/advisor/today",
          // One per BA per day — dedupe stops a re-run from re-notifying.
          groupKey: `daily_actions_ready:${baId}:${dueDate}`,
        });
        if (inserted) dispatched++;
      } catch (err) {
        this.logger.error(
          `Failed to dispatch daily_actions_ready for BA ${baId}`,
          err as Error,
        );
      }
    }

    this.logger.log(`Daily actions notifications dispatched: ${dispatched}`);
  }
}
