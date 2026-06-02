import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { eq } from "drizzle-orm";
import {
  DATABASE_TOKEN,
  type Database,
} from "../../config/database.provider";
import { users } from "@loreal/database";
import { DailySuggestedActionsService } from "../ai/services/daily-suggested-actions.service";
import { SuggestedActionsRepository } from "../ai/repositories/suggested-actions.repository";
import { NotificationsService } from "../notifications/notifications.service";
import { RecommendationEngineService } from "../recommendations/services/recommendation-engine.service";

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
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly dailySuggestedActionsService: DailySuggestedActionsService,
    private readonly suggestedActionsRepo: SuggestedActionsRepository,
    private readonly recommendationEngine: RecommendationEngineService,
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

    const enriched = await this.attachProductSuggestions(dueDate);
    this.logger.log(
      `Product suggestions attached to ${enriched} product-bound actions`,
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

  /**
   * For every product-bound suggested action without a `productId`, ask the
   * recommendation engine to pick the most relevant in-stock product for the
   * BA's store and write it back. Runs as a best-effort second pass — a
   * failure here never empties the day's queue.
   */
  private async attachProductSuggestions(dueDate: string): Promise<number> {
    const unresolved =
      await this.suggestedActionsRepo.findUnresolvedProductBound(dueDate);
    if (unresolved.length === 0) return 0;

    const storeByUserId = await this.loadStoreByUserId(
      unresolved.map((u) => u.assignedToUserId),
    );

    let enriched = 0;
    for (const action of unresolved) {
      const storeId = storeByUserId.get(action.assignedToUserId);
      if (!storeId) continue;
      try {
        const [top] = await this.recommendationEngine.generateForCustomer({
          customerId: action.customerId,
          storeId,
          recommendedByUserId: action.assignedToUserId,
          limit: 1,
          withRationale: true,
          persist: true,
        });
        if (!top) continue;
        await this.suggestedActionsRepo.attachProductSuggestion(
          action.id,
          top.productId,
          top.messageDraft,
        );
        enriched++;
      } catch (err) {
        this.logger.warn(
          `Engine failed for action ${action.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    return enriched;
  }

  private async loadStoreByUserId(
    userIds: string[],
  ): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.db
      .select({ id: users.id, storeId: users.storeId })
      .from(users);
    // Filter in-memory: keeps the query simple and the user table is small
    // relative to the action queue we're enriching.
    const wanted = new Set(userIds);
    const map = new Map<string, string>();
    for (const r of rows) {
      if (wanted.has(r.id) && r.storeId) map.set(r.id, r.storeId);
    }
    return map;
  }
}
