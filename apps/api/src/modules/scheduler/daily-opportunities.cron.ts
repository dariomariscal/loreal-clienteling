import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DailyOpportunitiesService } from "../ai/services/daily-opportunities.service";

/**
 * Pre-computes the "hoy importan estas 5 clientas" queue every morning so
 * the home screen renders without any LLM call at request time. Runs after
 * SegmentationCron (2am) and LifecycleAlertsCron so the inputs it consumes
 * are already fresh.
 */
@Injectable()
export class DailyOpportunitiesCron {
  private readonly logger = new Logger(DailyOpportunitiesCron.name);

  constructor(
    private readonly dailyOpportunitiesService: DailyOpportunitiesService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async computeDailyOpportunities(): Promise<void> {
    const forDate = new Date().toISOString().slice(0, 10);
    this.logger.log(`Computing daily opportunities for ${forDate}...`);

    const result =
      await this.dailyOpportunitiesService.computeForDate(forDate);

    this.logger.log(
      `Daily opportunities computed for ${result.basProcessed} BAs (${forDate})`,
    );
  }
}
