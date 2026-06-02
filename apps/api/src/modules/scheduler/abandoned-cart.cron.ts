import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { abandonedCarts, customers } from "@loreal/database";
import { and, eq, isNull, gte, lte } from "drizzle-orm";
import { NotificationsService } from "../notifications/notifications.service";

/**
 * Carts abandoned 1–48 hours ago without recovery — surface a recovery
 * task to the BA who owns the customer. Skips carts that already
 * recovered (recoveredOrderId IS NOT NULL).
 *
 * Dedup is per-cart so an abandoned cart only nags the BA once.
 */
@Injectable()
export class AbandonedCartCron {
  private readonly logger = new Logger(AbandonedCartCron.name);

  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(NotificationsService)
    private notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkAbandoned(): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const rows = await this.db
      .select({
        id: abandonedCarts.id,
        customerId: abandonedCarts.customerId,
        totalValue: abandonedCarts.totalValue,
        abandonedAt: abandonedCarts.abandonedAt,
        firstName: customers.firstName,
        lastName: customers.lastName,
        assignedToUserId: customers.assignedToUserId,
        createdByUserId: customers.createdByUserId,
      })
      .from(abandonedCarts)
      .innerJoin(customers, eq(customers.id, abandonedCarts.customerId))
      .where(
        and(
          isNull(abandonedCarts.recoveredOrderId),
          gte(abandonedCarts.abandonedAt, twoDaysAgo),
          lte(abandonedCarts.abandonedAt, oneHourAgo),
        ),
      );

    if (rows.length === 0) return;
    let dispatched = 0;

    for (const row of rows) {
      const recipient = row.assignedToUserId ?? row.createdByUserId;
      if (!recipient) continue;
      const inserted = await this.notifications.create({
        recipientUserId: recipient,
        kind: "abandoned_cart",
        title: "Carrito abandonado por recuperar",
        body: `${row.firstName} ${row.lastName} dejó un carrito de $${Number(row.totalValue).toFixed(2)}.`,
        actionUrl: `/customers/${row.customerId}`,
        customerId: row.customerId,
        groupKey: `abandoned_cart:${row.id}`,
      });
      if (inserted) dispatched++;
    }

    if (dispatched > 0) {
      this.logger.log(`Abandoned cart notifications: ${dispatched}`);
    }
  }
}
