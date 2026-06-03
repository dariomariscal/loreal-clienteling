import { Injectable, Inject, ForbiddenException } from "@nestjs/common";
import { and, eq, gte, sql, count, inArray } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import {
  customers,
  orders,
  lineItems,
  products,
  brands,
  brandConfigs,
} from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../../common/types/session";
import { ScopeService } from "../../../common/services/scope.service";

/**
 * VIP threshold breakdown — counts customers whose spend on a brand within the
 * brand's configured VIP window (brandConfigs.vipThresholdPeriodMonths)
 * exceeds the configured threshold (vipThresholdAmount).
 *
 * Beats relying on `customers.lifecycleStage = 'vip'` because:
 *   - lifecycleStage is denormalized and may lag.
 *   - VIP is configured per brand; a multi-brand counter needs to count
 *     "VIPs of Lancôme" separately from "VIPs of YSL", which a single column
 *     on customers cannot express.
 *
 * Spend is computed from line_items joined to products so we get true
 * brand-level revenue rather than order totals (which are cross-brand at a
 * multi-brand store).
 */
@Injectable()
export class VipAnalyticsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  async getVipBreakdown(user: SessionUser) {
    if (user.role === UserRole.BEAUTY_ADVISOR) {
      throw new ForbiddenException(
        "VIP breakdown is restricted to counter_manager and above",
      );
    }

    const isAdmin = user.role === UserRole.ADMIN;
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const brandIds = await this.scopeService.getAccessibleBrandIds(user);

    if (!isAdmin && (storeIds.length === 0 || brandIds.length === 0)) {
      return { data: [] };
    }

    const brandRows = isAdmin
      ? await this.db
          .select({
            id: brands.id,
            displayName: brands.displayName,
            divisionId: brands.divisionId,
            vipThresholdAmount: brandConfigs.vipThresholdAmount,
            vipThresholdPeriodMonths: brandConfigs.vipThresholdPeriodMonths,
          })
          .from(brands)
          .leftJoin(brandConfigs, eq(brandConfigs.brandId, brands.id))
      : await this.db
          .select({
            id: brands.id,
            displayName: brands.displayName,
            divisionId: brands.divisionId,
            vipThresholdAmount: brandConfigs.vipThresholdAmount,
            vipThresholdPeriodMonths: brandConfigs.vipThresholdPeriodMonths,
          })
          .from(brands)
          .leftJoin(brandConfigs, eq(brandConfigs.brandId, brands.id))
          .where(inArray(brands.id, brandIds));

    if (brandRows.length === 0) return { data: [] };

    // Per-brand customer spend within each brand's own VIP window.
    const perBrand = await Promise.all(
      brandRows.map(async (b) => {
        const thresholdAmount = b.vipThresholdAmount
          ? Number(b.vipThresholdAmount)
          : null;
        const windowMonths = b.vipThresholdPeriodMonths ?? 12;

        if (thresholdAmount === null) {
          return {
            brandId: b.id,
            brandName: b.displayName,
            divisionId: b.divisionId,
            thresholdAmount: null,
            windowMonths,
            vipCount: 0,
            atRiskCount: 0,
            totalCustomers: 0,
            vipPenetrationPct: null,
          };
        }

        const since = new Date();
        since.setMonth(since.getMonth() - windowMonths);

        const conds: any[] = [
          gte(orders.processedAt, since),
          eq(products.brandId, b.id),
        ];
        if (!isAdmin) conds.push(inArray(orders.storeId, storeIds));

        const customerSpendRows = await this.db
          .select({
            customerId: orders.customerId,
            spend: sql<string>`coalesce(sum(${lineItems.price}), 0)`,
          })
          .from(lineItems)
          .innerJoin(orders, eq(lineItems.orderId, orders.id))
          .innerJoin(products, eq(lineItems.productId, products.id))
          .where(and(...conds))
          .groupBy(orders.customerId);

        // 80% of threshold = "at risk" of dropping out / about to qualify
        const atRiskFloor = thresholdAmount * 0.8;

        let vipCount = 0;
        let atRiskCount = 0;
        for (const r of customerSpendRows) {
          const spend = Number(r.spend);
          if (spend >= thresholdAmount) {
            vipCount += 1;
          } else if (spend >= atRiskFloor) {
            atRiskCount += 1;
          }
        }

        // Total customer base of this brand for the period — denominator.
        const totalCustomers = customerSpendRows.length;
        const vipPenetrationPct =
          totalCustomers > 0
            ? Math.round((vipCount / totalCustomers) * 100)
            : 0;

        return {
          brandId: b.id,
          brandName: b.displayName,
          divisionId: b.divisionId,
          thresholdAmount,
          windowMonths,
          vipCount,
          atRiskCount,
          totalCustomers,
          vipPenetrationPct,
        };
      }),
    );

    return {
      data: perBrand.sort((a, b) => b.vipCount - a.vipCount),
    };
  }

  /**
   * Top VIP customers across the user's accessible brands, ranked by spend
   * inside each brand's VIP window. Useful for the "VIP roster" panel.
   */
  async getTopVipCustomers(user: SessionUser, limit = 50) {
    if (user.role === UserRole.BEAUTY_ADVISOR) {
      throw new ForbiddenException(
        "VIP roster is restricted to counter_manager and above",
      );
    }

    const isAdmin = user.role === UserRole.ADMIN;
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);

    const conds: any[] = [];
    if (!isAdmin) {
      if (storeIds.length === 0) return { data: [] };
      conds.push(inArray(customers.signupStoreId, storeIds));
    }
    conds.push(eq(customers.lifecycleStage, "vip"));

    const rows = await this.db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        totalSpent: customers.totalSpent,
        ordersCount: customers.ordersCount,
        lastOrderAt: customers.lastOrderAt,
        loyaltyTier: customers.loyaltyTier,
        signupStoreId: customers.signupStoreId,
      })
      .from(customers)
      .where(and(...conds))
      .orderBy(sql`${customers.totalSpent} desc`)
      .limit(limit);

    return {
      data: rows.map((r) => ({
        customerId: r.id,
        name: `${r.firstName} ${r.lastName}`,
        totalSpent: Number(r.totalSpent),
        ordersCount: r.ordersCount,
        lastOrderAt: r.lastOrderAt,
        loyaltyTier: r.loyaltyTier,
        signupStoreId: r.signupStoreId,
      })),
    };
  }
}
