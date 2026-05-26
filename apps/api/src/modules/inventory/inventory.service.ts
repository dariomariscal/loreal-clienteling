import { Injectable, Inject, ForbiddenException } from "@nestjs/common";
import { eq, and, inArray, asc, sql, count } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  inventoryLevels,
  products,
  productVariants,
  stores,
} from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import type { InventoryAlertsFiltersDto } from "../../dtos/inventory.dto";

@Injectable()
export class InventoryService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  /**
   * Low-stock and out-of-stock alerts for the user's accessible stores.
   * Used by the Counter Manager dashboard's "operación" panel. Defaults to
   * `low` and `out_of_stock` (drop `available` since it's not actionable).
   */
  async getAlerts(user: SessionUser, filters: InventoryAlertsFiltersDto) {
    const storeId = filters.storeId ?? user.storeId;
    if (!storeId && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        "Cannot resolve inventory alerts without a storeId",
      );
    }

    if (storeId && user.role !== UserRole.ADMIN) {
      const accessibleStoreIds = await this.scopeService.getAccessibleStoreIds(user);
      if (!accessibleStoreIds.includes(storeId)) {
        throw new ForbiddenException("You do not have access to this store");
      }
    }

    const requestedStatuses = filters.status
      ? Array.isArray(filters.status)
        ? filters.status
        : [filters.status]
      : (["low", "out_of_stock"] as const);

    const conditions = [
      inArray(inventoryLevels.stockStatus, requestedStatuses as unknown as string[]),
      ...(storeId ? [eq(inventoryLevels.storeId, storeId)] : []),
    ];

    return this.db
      .select({
        inventoryLevelId: inventoryLevels.id,
        productId: inventoryLevels.productId,
        variantId: inventoryLevels.variantId,
        storeId: inventoryLevels.storeId,
        availableQuantity: inventoryLevels.availableQuantity,
        committedQuantity: inventoryLevels.committedQuantity,
        stockStatus: inventoryLevels.stockStatus,
        lastSyncedAt: inventoryLevels.lastSyncedAt,
        productTitle: products.title,
        productSku: products.sku,
        variantTitle: productVariants.title,
        variantSku: productVariants.sku,
      })
      .from(inventoryLevels)
      .leftJoin(products, eq(products.id, inventoryLevels.productId))
      .leftJoin(
        productVariants,
        eq(productVariants.id, inventoryLevels.variantId),
      )
      .where(and(...conditions))
      .orderBy(asc(inventoryLevels.stockStatus), asc(inventoryLevels.availableQuantity))
      .limit(filters.limit ?? 50);
  }

  /**
   * Multi-store inventory summary for the user's accessible stores. Returns
   * a per-store roll-up (counts by stock status) plus the SKUs that are
   * low / out_of_stock in the most stores within the zone — a quick way for
   * an Area Manager to spot zone-wide gaps.
   */
  async getZoneSummary(
    user: SessionUser,
    opts: { limit?: number } = {},
  ) {
    if (
      user.role !== UserRole.AREA_MANAGER &&
      user.role !== UserRole.NATIONAL_RETAIL_MANAGER &&
      user.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        "Zone inventory summary is restricted to area_manager, national_retail_manager and admin",
      );
    }

    const storeIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === UserRole.ADMIN;
    const limit = Math.min(opts.limit ?? 20, 100);

    if (!isAdmin && storeIds.length === 0) {
      return {
        scope: { storeCount: 0 },
        byStore: [],
        topAlerts: [],
      };
    }

    const storeFilter = isAdmin ? undefined : inArray(inventoryLevels.storeId, storeIds);

    // Per-store roll-up: count by stock status
    const byStoreConds: any[] = storeFilter ? [storeFilter] : [];
    const byStore = await this.db
      .select({
        storeId: inventoryLevels.storeId,
        storeName: stores.displayName,
        total: count(),
        available: sql<number>`count(*) filter (where ${inventoryLevels.stockStatus} = 'available')::int`,
        low: sql<number>`count(*) filter (where ${inventoryLevels.stockStatus} = 'low')::int`,
        outOfStock: sql<number>`count(*) filter (where ${inventoryLevels.stockStatus} = 'out_of_stock')::int`,
      })
      .from(inventoryLevels)
      .innerJoin(stores, eq(stores.id, inventoryLevels.storeId))
      .where(byStoreConds.length ? and(...byStoreConds) : undefined)
      .groupBy(inventoryLevels.storeId, stores.displayName)
      .orderBy(
        sql`count(*) filter (where ${inventoryLevels.stockStatus} in ('low','out_of_stock')) desc`,
      );

    // Most-affected SKUs across the zone
    const topAlertsConds: any[] = [
      sql`${inventoryLevels.stockStatus} in ('low', 'out_of_stock')`,
    ];
    if (storeFilter) topAlertsConds.push(storeFilter);

    const topAlerts = await this.db
      .select({
        productId: inventoryLevels.productId,
        variantId: inventoryLevels.variantId,
        productTitle: products.title,
        productSku: products.sku,
        variantTitle: productVariants.title,
        variantSku: productVariants.sku,
        affectedStoreCount: sql<number>`count(distinct ${inventoryLevels.storeId})::int`,
        totalAvailable: sql<number>`coalesce(sum(${inventoryLevels.availableQuantity}), 0)::int`,
      })
      .from(inventoryLevels)
      .leftJoin(products, eq(products.id, inventoryLevels.productId))
      .leftJoin(productVariants, eq(productVariants.id, inventoryLevels.variantId))
      .where(and(...topAlertsConds))
      .groupBy(
        inventoryLevels.productId,
        inventoryLevels.variantId,
        products.title,
        products.sku,
        productVariants.title,
        productVariants.sku,
      )
      .orderBy(sql`count(distinct ${inventoryLevels.storeId}) desc`)
      .limit(limit);

    return {
      scope: { storeCount: isAdmin ? null : storeIds.length },
      byStore,
      topAlerts,
    };
  }
}
