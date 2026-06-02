import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { and, isNull, lt, sql } from "drizzle-orm";
import { suggestedActions } from "@loreal/database";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { NotificationsService } from "../notifications/notifications.service";

/**
 * Daily 8am sweep of suggested actions that passed their due date without
 * being completed or dismissed. Sends one aggregated `followup_overdue`
 * notification per BA with the count — never one per row — to keep the
 * inbox useful.
 */
@Injectable()
export class FollowupOverdueCron {
  private readonly logger = new Logger(FollowupOverdueCron.name);

  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(NotificationsService)
    private notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async findOverdueFollowups(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);

    const rows = await this.db
      .select({
        assignedToUserId: suggestedActions.assignedToUserId,
        overdueCount: sql<number>`count(*)::int`,
      })
      .from(suggestedActions)
      .where(
        and(
          lt(suggestedActions.dueDate, today),
          isNull(suggestedActions.completedAt),
          isNull(suggestedActions.dismissedAt),
        ),
      )
      .groupBy(suggestedActions.assignedToUserId);

    if (rows.length === 0) return;

    let dispatched = 0;
    for (const row of rows) {
      try {
        const inserted = await this.notifications.create({
          recipientUserId: row.assignedToUserId,
          kind: "followup_overdue",
          title: "Tienes seguimientos atrasados",
          body:
            row.overdueCount === 1
              ? "Una tarea sugerida pasó su fecha límite."
              : `${row.overdueCount} tareas sugeridas pasaron su fecha límite.`,
          actionUrl: "/advisor/tasks",
          // One bucket per BA per day — dedupe stops a re-run from spamming.
          groupKey: `followup_overdue:${row.assignedToUserId}:${today}`,
        });
        if (inserted) dispatched++;
      } catch (err) {
        this.logger.error(
          `Failed to dispatch followup_overdue for BA ${row.assignedToUserId}`,
          err as Error,
        );
      }
    }

    this.logger.log(`Followup overdue notifications: ${dispatched}`);
  }
}
