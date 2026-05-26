import { Injectable, Inject, ForbiddenException } from "@nestjs/common";
import { eq, and, inArray, asc } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { inventoryLevels, products, productVariants } from "@loreal/database";
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
}
