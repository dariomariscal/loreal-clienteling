import { Injectable, Inject } from "@nestjs/common";
import { eq, and, gt } from "drizzle-orm";
import {
  DATABASE_TOKEN,
  type Database,
} from "../../../config/database.provider";
import {
  lineItems,
  orders,
  products,
  inventoryLevels,
} from "@loreal/database";
import { calculateNextPurchase } from "@loreal/domain";
import type { ProductRecommendationCandidate } from "@loreal/contracts";
import type {
  RecommendationSignalSourceContext,
  RecommendationSignalSourceStrategy,
} from "./recommendation-signal-source";

const DEPLETION_WINDOW_DAYS = 30;

/**
 * Replenishment signal: per-product history → predicted depletion date →
 * candidate score that rises as the depletion date approaches.
 *
 * Two normalisations matter:
 *   - Score is `1 - clamp(daysUntil / windowDays, 0, 1)` so a product due
 *     today scores 1 and one due in 30 days scores 0.
 *   - Already-depleted products (past the window) still score high — they
 *     are the most urgent rebuy candidates.
 */
@Injectable()
export class ReplenishmentDueSource
  implements RecommendationSignalSourceStrategy
{
  readonly name = "replenishment_due";

  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async fetchCandidates(
    context: RecommendationSignalSourceContext,
  ): Promise<ProductRecommendationCandidate[]> {
    const history = await this.db
      .select({
        productId: lineItems.productId,
        processedAt: orders.processedAt,
        replenishmentDays: products.replenishmentDays,
        stockQuantity: inventoryLevels.availableQuantity,
      })
      .from(lineItems)
      .innerJoin(orders, eq(orders.id, lineItems.orderId))
      .innerJoin(products, eq(products.id, lineItems.productId))
      .leftJoin(
        inventoryLevels,
        and(
          eq(inventoryLevels.productId, products.id),
          eq(inventoryLevels.storeId, context.storeId),
        ),
      )
      .where(
        and(
          eq(orders.customerId, context.customerId),
          eq(products.status, "active"),
        ),
      );

    const byProduct = new Map<
      string,
      {
        history: Array<{ productId: string; processedAt: Date }>;
        replenishmentDays: number | null;
        hasStock: boolean;
      }
    >();
    for (const row of history) {
      const entry =
        byProduct.get(row.productId) ??
        {
          history: [],
          replenishmentDays: row.replenishmentDays,
          hasStock: false,
        };
      entry.history.push({
        productId: row.productId,
        processedAt: new Date(row.processedAt),
      });
      if ((row.stockQuantity ?? 0) > 0) entry.hasStock = true;
      byProduct.set(row.productId, entry);
    }

    const now = new Date();
    const candidates: ProductRecommendationCandidate[] = [];
    for (const [productId, entry] of byProduct) {
      if (!entry.hasStock) continue;
      if (!entry.replenishmentDays) continue;

      const replenishment = calculateNextPurchase({
        productId,
        replenishmentDays: entry.replenishmentDays,
        orderHistory: entry.history,
        now,
      });
      if (!replenishment) continue;
      if (!replenishment.isInWindow && !replenishment.isPastWindow) continue;

      const daysUntil = replenishment.daysUntilDepletion;
      const score = scoreFromDaysUntil(daysUntil);
      candidates.push({
        productId,
        source: "replenishment_due",
        score,
        replenishmentDaysUntilDepletion: daysUntil,
      });
    }

    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, context.limit);
  }
}

function scoreFromDaysUntil(days: number): number {
  if (days <= 0) return 1;
  if (days >= DEPLETION_WINDOW_DAYS) return 0;
  return 1 - days / DEPLETION_WINDOW_DAYS;
}
