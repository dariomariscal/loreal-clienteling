import { Inject, Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  brandConfigs,
  brandStores,
  customerVisits,
  customers,
  messages,
  orders,
  suggestedActions,
} from "@loreal/database";
import { calculateSegment } from "@loreal/domain";

type Tx = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

const DEFAULT_VIP_SPENDING_THRESHOLD = 15_000; // MXN
const POINTS_PER_PESO = 0.1; // 10% of spend in loyalty points

function loyaltyTierForSpend(totalSpent: number): string | null {
  if (totalSpent >= 50_000) return "platinum";
  if (totalSpent >= 25_000) return "gold";
  if (totalSpent >= 10_000) return "silver";
  if (totalSpent > 0) return "bronze";
  return null;
}

// drizzle's `sql<Date | null>` is only a type hint — node-postgres returns
// timestamp aggregates (max(), etc.) as strings unless a parser is attached.
// Coerce defensively before handing to domain code that expects Date.
function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  return value instanceof Date ? value : new Date(value);
}

/**
 * Single owner of the denormalized customer fields:
 *   - lastInteractionAt: bumped on any BA→customer touch
 *   - totalSpent / ordersCount / averageOrderValue / lastOrderAt / loyaltyPoints / loyaltyTier:
 *     recomputed from orders after every commerce event
 *   - lifecycleStage / isActive: recomputed from the orders + messages aggregates
 *
 * Lives in CommonModule so any feature module can depend on it without
 * pulling in the customers module (which would create a cycle with orders →
 * customers → orders).
 */
@Injectable()
export class CustomerActivityService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  /**
   * Record that an advisor just interacted with the customer (note, message,
   * appointment booked, sample given, recommendation made, manual touch).
   * Drives the attribution window and the at_risk / dormant outreach signal.
   * Silent on missing customer — interaction logging should never fail the
   * caller's operation.
   */
  async touchInteraction(
    customerId: string,
    when: Date = new Date(),
    tx: Tx = this.db,
  ): Promise<void> {
    await tx
      .update(customers)
      .set({ lastInteractionAt: when, updatedAt: when })
      .where(eq(customers.id, customerId));
  }

  /**
   * Recompute all denormalized commerce metrics + lifecycle stage in one
   * transaction. Called from orders.create after an INSERT (and from cron for
   * drift correction). Accepts an optional Drizzle transaction so callers can
   * keep the whole order flow atomic.
   */
  async recomputeMetricsAndSegment(
    customerId: string,
    tx: Tx = this.db,
    now: Date = new Date(),
  ): Promise<void> {
    const [customer] = await tx
      .select({
        id: customers.id,
        signupStoreId: customers.signupStoreId,
        enrolledAt: customers.enrolledAt,
        lifecycleStage: customers.lifecycleStage,
        loyaltyTier: customers.loyaltyTier,
        isActive: customers.isActive,
      })
      .from(customers)
      .where(eq(customers.id, customerId));
    if (!customer) return;

    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    const [agg] = await tx
      .select({
        totalSpent: sql<string>`coalesce(sum(${orders.totalPrice}), 0)::numeric(14,2)`,
        ordersCount: sql<number>`count(*)::int`,
        lastOrderAt: sql<Date | null>`max(${orders.processedAt})`,
        ordersCount12m: sql<number>`count(*) filter (where ${orders.processedAt} >= ${twelveMonthsAgo})::int`,
        totalSpent12m: sql<number>`coalesce(sum(${orders.totalPrice}) filter (where ${orders.processedAt} >= ${twelveMonthsAgo}), 0)::float`,
      })
      .from(orders)
      .where(eq(orders.customerId, customerId));

    const [msgAgg] = await tx
      .select({
        lastMessageAt: sql<Date | null>`max(${messages.sentAt})`,
      })
      .from(messages)
      .where(eq(messages.customerId, customerId));

    const totalSpentNum = Number(agg?.totalSpent ?? 0);
    const ordersCount = agg?.ordersCount ?? 0;
    const averageOrderValue =
      ordersCount > 0 ? totalSpentNum / ordersCount : 0;
    const loyaltyPoints = Math.floor(totalSpentNum * POINTS_PER_PESO);
    const loyaltyTier = loyaltyTierForSpend(totalSpentNum);

    const threshold = await this.resolveVipThreshold(
      customer.signupStoreId,
      tx,
    );

    const lastOrderAt = toDate(agg?.lastOrderAt);
    const lastMessageAt = toDate(msgAgg?.lastMessageAt);

    const segment = calculateSegment({
      enrolledAt: toDate(customer.enrolledAt) ?? now,
      orderCount12Months: agg?.ordersCount12m ?? 0,
      totalSpending12Months: agg?.totalSpent12m ?? 0,
      lastOrderAt,
      lastMessageAt,
      vipSpendingThreshold: threshold,
      now,
    });

    await tx
      .update(customers)
      .set({
        totalSpent: totalSpentNum.toFixed(2),
        ordersCount,
        averageOrderValue: averageOrderValue.toFixed(2),
        lastOrderAt,
        loyaltyPoints,
        loyaltyTier,
        lifecycleStage: segment.stage,
        isActive: segment.isActive,
        updatedAt: now,
      })
      .where(eq(customers.id, customerId));
  }

  /**
   * Mirror a marketing-channel consent change into the denormalized
   * `accepts_marketing_*` flag on `customers`. Schema keeps both because the
   * flags are read on every list query, but `consents` remains the audit
   * source of truth.
   */
  async syncMarketingFlag(
    customerId: string,
    consentType: string,
    granted: boolean,
    tx: Tx = this.db,
  ): Promise<void> {
    const column = MARKETING_CONSENT_TO_COLUMN[consentType];
    if (!column) return;
    const now = new Date();
    await tx
      .update(customers)
      .set({ [column]: granted, updatedAt: now } as Partial<
        typeof customers.$inferInsert
      >)
      .where(eq(customers.id, customerId));
  }

  /**
   * Mirror the most recent customer_visits row onto `customers.lastBaUserId`
   * + `lastVisitAt`. Tulip "Client Book" pattern — the customer profile shows
   * "last seen by X" without joining customer_visits at read time.
   */
  async recomputeLastBaFromVisit(
    customerId: string,
    tx: Tx = this.db,
  ): Promise<void> {
    const [row] = await tx
      .select({
        attendedByUserId: customerVisits.attendedByUserId,
        startedAt: customerVisits.startedAt,
      })
      .from(customerVisits)
      .where(eq(customerVisits.customerId, customerId))
      .orderBy(sql`${customerVisits.startedAt} DESC`)
      .limit(1);

    if (!row) return;

    await tx
      .update(customers)
      .set({
        lastBaUserId: row.attendedByUserId,
        lastVisitAt: toDate(row.startedAt),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId));
  }

  /**
   * Recompute the 6 denormalized follow-up columns on `customers` from
   * `suggested_actions`. Drives "tipo de seguimiento" (last + next) and the
   * Tulip-style overdue / open counters used by dashboards and exports.
   *
   * Called whenever a suggested_action is inserted, completed, or dismissed.
   */
  async recomputeFollowUpFields(
    customerId: string,
    tx: Tx = this.db,
  ): Promise<void> {
    // Aggregate open / overdue counts in a single pass.
    const [agg] = await tx
      .select({
        openCount: sql<number>`count(*) filter (where ${suggestedActions.completedAt} is null and ${suggestedActions.dismissedAt} is null)::int`,
        overdueCount: sql<number>`count(*) filter (where ${suggestedActions.completedAt} is null and ${suggestedActions.dismissedAt} is null and ${suggestedActions.dueDate} < current_date)::int`,
      })
      .from(suggestedActions)
      .where(eq(suggestedActions.customerId, customerId));

    // Earliest pending = next action surfaced in the UI / export.
    const [nextRow] = await tx
      .select({
        triggerType: suggestedActions.triggerType,
        dueDate: suggestedActions.dueDate,
      })
      .from(suggestedActions)
      .where(
        sql`${suggestedActions.customerId} = ${customerId}
            and ${suggestedActions.completedAt} is null
            and ${suggestedActions.dismissedAt} is null`,
      )
      .orderBy(suggestedActions.dueDate)
      .limit(1);

    // Most recent completed = last follow-up performed.
    const [lastRow] = await tx
      .select({
        triggerType: suggestedActions.triggerType,
        completedAt: suggestedActions.completedAt,
      })
      .from(suggestedActions)
      .where(
        sql`${suggestedActions.customerId} = ${customerId}
            and ${suggestedActions.completedAt} is not null`,
      )
      .orderBy(sql`${suggestedActions.completedAt} DESC`)
      .limit(1);

    await tx
      .update(customers)
      .set({
        nextFollowUpType: nextRow?.triggerType ?? null,
        nextFollowUpDueDate: nextRow?.dueDate ?? null,
        lastFollowUpType: lastRow?.triggerType ?? null,
        lastFollowUpCompletedAt: toDate(lastRow?.completedAt ?? null),
        openFollowUpCount: agg?.openCount ?? 0,
        overdueFollowUpCount: agg?.overdueCount ?? 0,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId));
  }

  private async resolveVipThreshold(
    storeId: string,
    tx: Tx,
  ): Promise<number> {
    const rows = await tx
      .select({ vipThresholdAmount: brandConfigs.vipThresholdAmount })
      .from(brandStores)
      .innerJoin(
        brandConfigs,
        eq(brandConfigs.brandId, brandStores.brandId),
      )
      .where(eq(brandStores.storeId, storeId));

    let min: number | null = null;
    for (const r of rows) {
      const value = r.vipThresholdAmount ? Number(r.vipThresholdAmount) : null;
      if (value == null || !Number.isFinite(value) || value <= 0) continue;
      min = min == null ? value : Math.min(min, value);
    }
    return min ?? DEFAULT_VIP_SPENDING_THRESHOLD;
  }
}

const MARKETING_CONSENT_TO_COLUMN: Record<string, keyof typeof customers> = {
  marketing_email: "acceptsMarketingEmail",
  marketing_sms: "acceptsMarketingSms",
  marketing_whatsapp: "acceptsMarketingWhatsapp",
};
