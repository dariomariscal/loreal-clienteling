import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DailySuggestedActionsService } from "../ai/services/daily-suggested-actions.service";

/**
 * Pre-computes the "hoy importan estas 5 clientas" queue every morning so
 * the home screen renders without any LLM call at request time. Runs after
 * SegmentationCron (2am) and LifecycleAlertsCron so the inputs it consumes
 * are already fresh.
 */
@Injectable()
export class DailySuggestedActionsCron {
  private readonly logger = new Logger(DailySuggestedActionsCron.name);

  constructor(
    private readonly dailySuggestedActionsService: DailySuggestedActionsService,
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
  }
}
