import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { customers, orders, lineItems, products } from "@loreal/database";
import {
  generateLifeEventAlerts,
  calculateNextPurchase,
  type ReplenishmentResult,
} from "@loreal/domain";
import { eq, and, isNotNull } from "drizzle-orm";
import { NotificationsService } from "../notifications/notifications.service";

/**
 * Daily generator for the three lifecycle-driven alerts:
 *
 *   - birthday_today      → fires the day of the customer's birthday
 *   - dormant_customer    → re-engage signal (long gap since last interaction)
 *   - replenishment_due   → per-product, when within the replenishment window
 *
 * Previous version wrote these as rows in `messages` with `channel=email`,
 * which was wrong: they're internal BA alerts, not outbound customer
 * communications. Now they go through NotificationsService — which handles
 * dedup, push, and respects the BA's preferences.
 */
@Injectable()
export class LifecycleAlertsCron {
  private readonly logger = new Logger(LifecycleAlertsCron.name);

  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(NotificationsService)
    private notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async generateAlerts(): Promise<void> {
    this.logger.log("Generando alertas de eventos de vida...");
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const allCustomers = await this.db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        birthday: customers.birthday,
        enrolledAt: customers.enrolledAt,
        lifecycleStage: customers.lifecycleStage,
        assignedToUserId: customers.assignedToUserId,
        createdByUserId: customers.createdByUserId,
      })
      .from(customers);

    let dispatched = 0;

    for (const customer of allCustomers) {
      const recipient =
        customer.assignedToUserId ?? customer.createdByUserId;
      if (!recipient) continue;

      const customerName = `${customer.firstName} ${customer.lastName}`;

      // Replenishment is computed per product; the domain helper returns
      // ReplenishmentResult[] for SKUs currently inside their replenishment
      // window.
      const replenishmentAlerts = await this.getReplenishmentAlerts(
        customer.id,
        now,
      );

      // generateLifeEventAlerts maps customer signals → discrete LifeEventAlert
      // entries with a `type` field that mirrors our notification kinds when
      // possible (birthday, win_back, replenishment).
      const lifeAlerts = generateLifeEventAlerts(
        {
          customerId: customer.id,
          birthday: customer.birthday ? new Date(customer.birthday) : null,
          enrolledAt: customer.enrolledAt,
          assignedToUserId: recipient,
        },
        replenishmentAlerts,
        now,
      );

      for (const alert of lifeAlerts) {
        const inserted = await this.dispatch(
          alert.type,
          recipient,
          customer.id,
          customerName,
          alert.label,
          today,
        );
        if (inserted) dispatched++;
      }

      // Replenishment alerts include the productId, which `generateLifeEventAlerts`
      // strips. Iterate them separately so the notification carries the SKU.
      for (const r of replenishmentAlerts) {
        const inserted = await this.notifications.create({
          recipientUserId: recipient,
          kind: "replenishment_due",
          title: `Replenishment: ${customerName}`,
          body:
            r.daysUntilDepletion <= 0
              ? "Producto probablemente ya se acabó."
              : `Producto se acaba en ~${r.daysUntilDepletion} días.`,
          actionUrl: `/customers/${customer.id}`,
          customerId: customer.id,
          productId: r.productId,
          groupKey: `replenishment_due:${customer.id}:${r.productId}:${today}`,
        });
        if (inserted) dispatched++;
      }

      // Independent of the domain helper, also fire `dormant_customer` for
      // customers in lifecycleStage=dormant. Segmentation cron computes the
      // stage at 2am, so by 6am the value is fresh.
      if (customer.lifecycleStage === "dormant") {
        const inserted = await this.notifications.create({
          recipientUserId: recipient,
          kind: "dormant_customer",
          title: "Cliente en riesgo",
          body: `${customerName} no ha vuelto en mucho tiempo. Re-engánchala.`,
          actionUrl: `/customers/${customer.id}`,
          customerId: customer.id,
          groupKey: `dormant_customer:${customer.id}:${today}`,
        });
        if (inserted) dispatched++;
      }
    }

    this.logger.log(`Alertas de lifecycle generadas: ${dispatched}`);
  }

  private async dispatch(
    domainType: string,
    recipient: string,
    customerId: string,
    customerName: string,
    label: string,
    today: string,
  ): Promise<boolean> {
    // Translate the domain alert type into a NotificationKind. Replenishment
    // is handled outside this method (it needs the productId, which the
    // domain helper does not propagate).
    if (domainType === "birthday") {
      const result = await this.notifications.create({
        recipientUserId: recipient,
        kind: "birthday_today",
        title: `Cumpleaños hoy: ${customerName}`,
        body: label,
        actionUrl: `/customers/${customerId}`,
        customerId,
        groupKey: `birthday_today:${customerId}:${today}`,
      });
      return result != null;
    }
    if (domainType === "win_back") {
      const result = await this.notifications.create({
        recipientUserId: recipient,
        kind: "dormant_customer",
        title: `Win-back: ${customerName}`,
        body: label,
        actionUrl: `/customers/${customerId}`,
        customerId,
        groupKey: `dormant_customer:${customerId}:${today}`,
      });
      return result != null;
    }
    // Unknown / unsupported domain type (e.g. anniversary "special_event")
    // is not part of the BA-only alert set — skip silently.
    return false;
  }

  private async getReplenishmentAlerts(
    customerId: string,
    now: Date,
  ): Promise<ReplenishmentResult[]> {
    const customerOrders = await this.db
      .select({
        processedAt: orders.processedAt,
        productId: lineItems.productId,
        replenishmentDays: products.replenishmentDays,
      })
      .from(orders)
      .innerJoin(lineItems, eq(lineItems.orderId, orders.id))
      .innerJoin(products, eq(products.id, lineItems.productId))
      .where(
        and(
          eq(orders.customerId, customerId),
          isNotNull(products.replenishmentDays),
        ),
      );

    if (customerOrders.length === 0) return [];

    const byProduct = new Map<
      string,
      { processedAt: Date; replenishmentDays: number }[]
    >();
    for (const row of customerOrders) {
      const list = byProduct.get(row.productId) ?? [];
      list.push({
        processedAt: row.processedAt,
        replenishmentDays: row.replenishmentDays!,
      });
      byProduct.set(row.productId, list);
    }

    const results: ReplenishmentResult[] = [];
    for (const [productId, rows] of byProduct) {
      const result = calculateNextPurchase({
        productId,
        replenishmentDays: rows[0].replenishmentDays,
        orderHistory: rows.map((r) => ({
          processedAt: r.processedAt,
          productId,
        })),
        now,
      });
      if (result?.isInWindow) results.push(result);
    }
    return results;
  }
}
