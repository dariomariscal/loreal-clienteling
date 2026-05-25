import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  customers,
  orders,
  lineItems,
  products,
  messages,
} from "@loreal/database";
import {
  generateLifeEventAlerts,
  calculateNextPurchase,
  type ReplenishmentResult,
} from "@loreal/domain";
import { eq, sql, and, isNotNull } from "drizzle-orm";
import { AuditService } from "../../common/services/audit.service";

@Injectable()
export class LifecycleAlertsCron {
  private readonly logger = new Logger(LifecycleAlertsCron.name);

  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(AuditService) private auditService: AuditService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async generateAlerts(): Promise<void> {
    this.logger.log("Generando alertas de eventos de vida...");

    const now = new Date();

    // Fetch all customers with their assigned BA
    const allCustomers = await this.db
      .select({
        id: customers.id,
        birthday: customers.birthday,
        enrolledAt: customers.enrolledAt,
        assignedToUserId: customers.assignedToUserId,
        createdByUserId: customers.createdByUserId,
      })
      .from(customers);

    let totalAlerts = 0;

    for (const customer of allCustomers) {
      const assignedToUserId =
        customer.assignedToUserId ?? customer.createdByUserId;

      // Calculate replenishment alerts for this customer
      const replenishmentAlerts = await this.getReplenishmentAlerts(
        customer.id,
        now,
      );

      const alerts = generateLifeEventAlerts(
        {
          customerId: customer.id,
          birthday: customer.birthday ? new Date(customer.birthday) : null,
          enrolledAt: customer.enrolledAt,
          assignedToUserId,
        },
        replenishmentAlerts,
        now,
      );

      // Persist alerts as messages (so they show up in the BA's workflow)
      for (const alert of alerts) {
        // Check if a similar alert was already sent recently (avoid duplicates)
        const [existing] = await this.db
          .select({ id: messages.id })
          .from(messages)
          .where(
            and(
              eq(messages.customerId, alert.customerId),
              eq(messages.campaignType, alert.type),
              eq(messages.channel, "email"),
              sql`${messages.sentAt} > now() - interval '7 days'`,
            ),
          )
          .limit(1);

        if (existing) continue;

        await this.db.insert(messages).values({
          customerId: alert.customerId,
          sentByUserId: alert.assignedToUserId,
          channel: "email",
          body: alert.label,
          campaignType: alert.type,
          sentAt: now,
        });

        totalAlerts++;
      }
    }

    this.logger.log(`Alertas generadas: ${totalAlerts}`);
  }

  private async getReplenishmentAlerts(
    customerId: string,
    now: Date,
  ): Promise<ReplenishmentResult[]> {
    // Get all ordered products for this customer with their duration info
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

    // Group by product and calculate replenishment for each
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

      if (result?.isInWindow) {
        results.push(result);
      }
    }

    return results;
  }
}
