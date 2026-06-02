import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { samples, customers, products } from "@loreal/database";
import { and, eq, gte, lte } from "drizzle-orm";
import { NotificationsService } from "../notifications/notifications.service";

/**
 * Samples handed out 7–14 days ago that haven't converted — the BA should
 * follow up while the impression is still fresh. Dedup per sample.
 */
@Injectable()
export class SampleFollowupCron {
  private readonly logger = new Logger(SampleFollowupCron.name);

  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(NotificationsService)
    private notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async findDueFollowups(): Promise<void> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const rows = await this.db
      .select({
        id: samples.id,
        customerId: samples.customerId,
        productId: samples.productId,
        deliveredByUserId: samples.deliveredByUserId,
        deliveredAt: samples.deliveredAt,
        firstName: customers.firstName,
        lastName: customers.lastName,
        productTitle: products.title,
      })
      .from(samples)
      .innerJoin(customers, eq(customers.id, samples.customerId))
      .innerJoin(products, eq(products.id, samples.productId))
      .where(
        and(
          eq(samples.isConverted, false),
          gte(samples.deliveredAt, fourteenDaysAgo),
          lte(samples.deliveredAt, sevenDaysAgo),
        ),
      );

    if (rows.length === 0) return;
    let dispatched = 0;

    for (const row of rows) {
      const days = Math.round(
        (now.getTime() - row.deliveredAt.getTime()) / (24 * 60 * 60 * 1000),
      );
      const inserted = await this.notifications.create({
        recipientUserId: row.deliveredByUserId,
        kind: "sample_followup_due",
        title: "Sample listo para follow-up",
        body: `${row.firstName} ${row.lastName} recibió ${row.productTitle} hace ${days} días. Pregúntale cómo le fue.`,
        actionUrl: `/customers/${row.customerId}`,
        customerId: row.customerId,
        productId: row.productId,
        groupKey: `sample_followup_due:${row.id}`,
      });
      if (inserted) dispatched++;
    }

    this.logger.log(`Sample followup notifications: ${dispatched}`);
  }
}
