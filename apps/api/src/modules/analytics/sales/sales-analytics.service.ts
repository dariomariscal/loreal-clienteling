import { Injectable, Inject } from "@nestjs/common";
import { eq, and, gte, lte, sql, count, sum, inArray } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import { orders, lineItems, products } from "@loreal/database";
import type { SessionUser } from "../../../common/types/session";
import { ScopeService } from "../../../common/services/scope.service";
import {
  getDefaultDateRange,
  getTrendDefaultDateRange,
} from "../shared/analytics-date.util";
import type { ReportFiltersInput } from "../shared/report-filters";
import { resolveScopedFilters } from "../shared/filter-resolution";

@Injectable()
export class SalesAnalyticsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  async getTrend(
    user: SessionUser,
    interval: "day" | "week" | "month",
    filters?: ReportFiltersInput,
  ) {
    const accessible = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
    const { from, to } = getTrendDefaultDateRange(filters);

    const { storeIds, baUserId, brandId } = await resolveScopedFilters(
      this.db,
      isAdmin,
      accessible,
      filters ?? {},
    );

    if (storeIds != null && storeIds.length === 0) {
      return { interval, data: [], period: { from, to } };
    }

    const conditions: any[] = [
      gte(orders.processedAt, from),
      lte(orders.processedAt, to),
    ];
    if (storeIds != null) conditions.push(inArray(orders.storeId, storeIds));
    if (baUserId) conditions.push(eq(orders.attributedUserId, baUserId));

    const dateTrunc = sql`date_trunc(${sql.raw(`'${interval}'`)}, ${orders.processedAt})`;

    // When brandId is set we have to aggregate through line_items + products
    // (orders rows aren't per-brand). Otherwise the order-level sum is faster.
    if (brandId) {
      const rows = await this.db
        .select({
          period: dateTrunc.as("period"),
          totalAmount: sql<string>`coalesce(sum(${lineItems.price} * ${lineItems.quantity}), 0)`,
          orderCount: sql<number>`count(distinct ${orders.id})::int`,
        })
        .from(lineItems)
        .innerJoin(orders, eq(orders.id, lineItems.orderId))
        .innerJoin(products, eq(products.id, lineItems.productId))
        .where(and(...conditions, eq(products.brandId, brandId)))
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
    filters?: ReportFiltersInput,
  ) {
    const accessible = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === "admin";
    const { from, to } = getDefaultDateRange(filters);

    const { storeIds, baUserId, brandId } = await resolveScopedFilters(
      this.db,
      isAdmin,
      accessible,
      filters ?? {},
    );

    if (storeIds != null && storeIds.length === 0) {
      return { groupBy, data: [], period: { from, to } };
    }

    const conditions: any[] = [
      gte(orders.processedAt, from),
      lte(orders.processedAt, to),
    ];
    if (storeIds != null) conditions.push(inArray(orders.storeId, storeIds));
    if (baUserId) conditions.push(eq(orders.attributedUserId, baUserId));
    if (brandId) conditions.push(eq(products.brandId, brandId));

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
