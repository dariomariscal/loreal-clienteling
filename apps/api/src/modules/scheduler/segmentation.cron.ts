import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  customers,
  orders,
  messages,
  brandConfigs,
  brandStores,
} from "@loreal/database";
import { calculateSegment } from "@loreal/domain";
import { eq, sql, gte, and } from "drizzle-orm";

const DEFAULT_VIP_SPENDING_THRESHOLD = 15_000; // MXN

@Injectable()
export class SegmentationCron {
  private readonly logger = new Logger(SegmentationCron.name);

  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async recalculateSegments(): Promise<void> {
    this.logger.log("Iniciando recalculación de segmentos...");

    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    // Load VIP spending thresholds per store (derived from each store's brand configs)
    const storeThresholds = await this.loadStoreThresholds();

    // Fetch all active customers with aggregated order data
    const allCustomers = await this.db
      .select({
        id: customers.id,
        signupStoreId: customers.signupStoreId,
        enrolledAt: customers.enrolledAt,
        lastOrderAt: customers.lastOrderAt,
        lifecycleStage: customers.lifecycleStage,
        isActive: customers.isActive,
      })
      .from(customers);

    let updated = 0;

    for (const customer of allCustomers) {
      // Count orders in last 12 months
      const [orderResult] = await this.db
        .select({
          count: sql<number>`count(*)::int`,
          total: sql<number>`coalesce(sum(${orders.totalPrice}), 0)::float`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.customerId, customer.id),
            gte(orders.processedAt, twelveMonthsAgo),
          ),
        );

      // Last message date
      const [msgResult] = await this.db
        .select({
          lastSentAt: sql<Date | null>`max(${messages.sentAt})`,
        })
        .from(messages)
        .where(eq(messages.customerId, customer.id));

      // Determine VIP threshold — use the customer's signup store's brand config
      // if available. When a store carries multiple brands, the lowest threshold
      // wins so a customer who hits any brand's bar is considered VIP.
      const threshold =
        storeThresholds.get(customer.signupStoreId) ??
        DEFAULT_VIP_SPENDING_THRESHOLD;

      const result = calculateSegment({
        enrolledAt: customer.enrolledAt,
        orderCount12Months: orderResult?.count ?? 0,
        totalSpending12Months: orderResult?.total ?? 0,
        lastOrderAt: customer.lastOrderAt,
        lastMessageAt: msgResult?.lastSentAt ?? null,
        vipSpendingThreshold: threshold,
        now,
      });

      // Only update if stage or isActive changed
      if (
        result.stage !== customer.lifecycleStage ||
        result.isActive !== customer.isActive
      ) {
        await this.db
          .update(customers)
          .set({
            lifecycleStage: result.stage,
            isActive: result.isActive,
            updatedAt: now,
          })
          .where(eq(customers.id, customer.id));

        updated++;
      }
    }

    this.logger.log(
      `Segmentación completada: ${allCustomers.length} evaluadas, ${updated} actualizadas`,
    );
  }

  /**
   * Resolve VIP spending thresholds keyed by store id by joining each store
   * with its brands' configs. brandConfigs.vipThresholdAmount is the canonical
   * column; replenishmentRules.vipSpendingThreshold (legacy JSON key) is a
   * fallback. When a store carries multiple brands we keep the minimum value.
   */
  private async loadStoreThresholds(): Promise<Map<string, number>> {
    const rows = await this.db
      .select({
        storeId: brandStores.storeId,
        vipThresholdAmount: brandConfigs.vipThresholdAmount,
        replenishmentRules: brandConfigs.replenishmentRules,
      })
      .from(brandStores)
      .innerJoin(brandConfigs, eq(brandConfigs.brandId, brandStores.brandId));

    const thresholds = new Map<string, number>();
    for (const row of rows) {
      const value = this.extractThreshold(
        row.vipThresholdAmount,
        row.replenishmentRules,
      );
      if (value == null) continue;
      const existing = thresholds.get(row.storeId);
      thresholds.set(row.storeId, existing == null ? value : Math.min(existing, value));
    }
    return thresholds;
  }

  private extractThreshold(
    vipThresholdAmount: string | null,
    replenishmentRules: unknown,
  ): number | null {
    if (vipThresholdAmount != null) {
      const parsed = Number(vipThresholdAmount);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    if (
      replenishmentRules &&
      typeof replenishmentRules === "object" &&
      "vipSpendingThreshold" in replenishmentRules
    ) {
      const parsed = Number(
        (replenishmentRules as Record<string, unknown>).vipSpendingThreshold,
      );
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return null;
  }
}
