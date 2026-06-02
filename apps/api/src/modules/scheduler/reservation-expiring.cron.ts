import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { productReservations, customers, products } from "@loreal/database";
import { and, eq, gte, lte } from "drizzle-orm";
import { NotificationsService } from "../notifications/notifications.service";

/**
 * Notify the BA who placed a product hold when it's within 24h of expiring
 * and still not picked up. Dedup per-reservation via `groupKey` so the BA
 * only gets the alert once per reservation per day.
 */
@Injectable()
export class ReservationExpiringCron {
  private readonly logger = new Logger(ReservationExpiringCron.name);

  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(NotificationsService)
    private notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkExpiring(): Promise<void> {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const rows = await this.db
      .select({
        id: productReservations.id,
        customerId: productReservations.customerId,
        productId: productReservations.productId,
        reservedByUserId: productReservations.reservedByUserId,
        holdUntil: productReservations.holdUntil,
        firstName: customers.firstName,
        lastName: customers.lastName,
        productTitle: products.title,
      })
      .from(productReservations)
      .innerJoin(customers, eq(customers.id, productReservations.customerId))
      .innerJoin(products, eq(products.id, productReservations.productId))
      .where(
        and(
          eq(productReservations.status, "held"),
          gte(productReservations.holdUntil, now),
          lte(productReservations.holdUntil, in24h),
        ),
      );

    if (rows.length === 0) return;
    const bucket = now.toISOString().slice(0, 10); // one alert per day max

    let dispatched = 0;
    for (const row of rows) {
      const hoursLeft = Math.max(
        1,
        Math.round((row.holdUntil.getTime() - now.getTime()) / (60 * 60 * 1000)),
      );
      const inserted = await this.notifications.create({
        recipientUserId: row.reservedByUserId,
        kind: "reservation_expiring",
        title: "Reservación por expirar",
        body: `${row.productTitle} apartado para ${row.firstName} ${row.lastName} vence en ~${hoursLeft}h.`,
        actionUrl: `/customers/${row.customerId}`,
        customerId: row.customerId,
        productId: row.productId,
        groupKey: `reservation_expiring:${row.id}:${bucket}`,
      });
      if (inserted) dispatched++;
    }

    if (dispatched > 0) {
      this.logger.log(`Reservation expiring notifications: ${dispatched}`);
    }
  }
}
