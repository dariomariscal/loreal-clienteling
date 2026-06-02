import { Injectable, Inject } from "@nestjs/common";
import { eq, and, gte, lte, sql, count, sum } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import { orders, lineItems, products } from "@loreal/database";
import type { SessionUser } from "../../../common/types/session";
import { ScopeService } from "../../../common/services/scope.service";
import {
  getDefaultDateRange,
  getTrendDefaultDateRange,
  type DateRange,
} from "../shared/analytics-date.util";
import { buildStoreScopeFilter } from "../shared/analytics-scope.util";

@Injectable()
export class SalesAnalyticsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  async getTrend(
    user: SessionUser,
    interval: "day" | "week" | "month",
    range?: DateRange,
  ) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";

    const { from, to } = getTrendDefaultDateRange(range);

    const conditions = [gte(orders.processedAt, from), lte(orders.processedAt, to)];
    const storeFilter = buildStoreScopeFilter(isAdmin, storeIds, orders.storeId);
    if (storeFilter) conditions.push(storeFilter as any);

    const dateTrunc = sql`date_trunc(${sql.raw(`'${interval}'`)}, ${orders.processedAt})`;

    const rows = await this.db
      .select({
        period: dateTrunc.as("period"),
        totalAmount: sum(orders.totalPrice),
        orderCount: count(),
      })
      .from(orders)
      .where(and(...conditions))
      .groupBy(dateTrunc)
      .orderBy(dateTrunc);

    return {
      interval,
      data: rows.map((r) => ({
        date: r.period,
        totalAmount: r.totalAmount ?? "0",
        orderCount: r.orderCount,
      })),
      period: { from, to },
    };
  }

  async getBreakdown(
    user: SessionUser,
    groupBy: "category" | "brand",
    range?: DateRange,
  ) {
    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
    const { from, to } = getDefaultDateRange(range);

    const conditions = [gte(orders.processedAt, from), lte(orders.processedAt, to)];
    const storeFilter = buildStoreScopeFilter(isAdmin, storeIds, orders.storeId);
    if (storeFilter) conditions.push(storeFilter as any);

    if (groupBy === "category") {
      const rows = await this.db
        .select({
          category: products.category,
          totalAmount: sum(lineItems.price),
          itemCount: count(),
        })
        .from(lineItems)
        .innerJoin(orders, eq(lineItems.orderId, orders.id))
        .innerJoin(products, eq(lineItems.productId, products.id))
        .where(and(...conditions))
        .groupBy(products.category);

      return { groupBy: "category", data: rows, period: { from, to } };
    }

    // groupBy === "brand"
    const rows = await this.db
      .select({
        brandId: products.brandId,
        totalAmount: sum(lineItems.price),
        itemCount: count(),
      })
      .from(lineItems)
      .innerJoin(orders, eq(lineItems.orderId, orders.id))
      .innerJoin(products, eq(lineItems.productId, products.id))
      .where(and(...conditions))
      .groupBy(products.brandId);

    return { groupBy: "brand", data: rows, period: { from, to } };
  }
}
