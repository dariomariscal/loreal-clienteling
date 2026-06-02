import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  wishlistItems,
  wishlists,
  customers,
  products,
  inventoryLevels,
} from "@loreal/database";
import { eq, sql } from "drizzle-orm";
import { NotificationsService } from "../notifications/notifications.service";

/**
 * Sweeps every wishlist item against current inventory + product price and
 * notifies the BA who owns the customer when:
 *   - inventory just came back (any available_quantity > 0 in any store)
 *   - product price dropped vs. its compare_at_price (`on sale`)
 *
 * Dedup is daily (groupKey includes today's date) so a BA isn't flooded
 * if a SKU keeps oscillating in and out of stock. Runs every 15 minutes.
 */
@Injectable()
export class WishlistWatcherCron {
  private readonly logger = new Logger(WishlistWatcherCron.name);

  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(NotificationsService)
    private notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async sweep(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);

    // Wishlist rows joined to the customer (and their assigned BA), the
    // product (price + compareAtPrice), and aggregated inventory across
    // stores so we know if the SKU is actually available anywhere.
    const rows = await this.db
      .select({
        itemId: wishlistItems.id,
        wishlistId: wishlistItems.wishlistId,
        productId: wishlistItems.productId,
        customerId: wishlists.customerId,
        assignedToUserId: customers.assignedToUserId,
        createdByUserId: customers.createdByUserId,
        firstName: customers.firstName,
        lastName: customers.lastName,
        productTitle: products.title,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        totalAvailable: sql<number>`coalesce(sum(${inventoryLevels.availableQuantity}), 0)::int`,
      })
      .from(wishlistItems)
      .innerJoin(wishlists, eq(wishlists.id, wishlistItems.wishlistId))
      .innerJoin(customers, eq(customers.id, wishlists.customerId))
      .innerJoin(products, eq(products.id, wishlistItems.productId))
      .leftJoin(
        inventoryLevels,
        eq(inventoryLevels.productId, wishlistItems.productId),
      )
      .groupBy(
        wishlistItems.id,
        wishlists.customerId,
        customers.assignedToUserId,
        customers.createdByUserId,
        customers.firstName,
        customers.lastName,
        products.title,
        products.price,
        products.compareAtPrice,
      );

      let dispatchedBackInStock = 0;
      let dispatchedPriceDrop = 0;

      for (const row of rows) {
        const recipient = row.assignedToUserId ?? row.createdByUserId;
        if (!recipient) continue;
        const customerName = `${row.firstName} ${row.lastName}`;

        // Back-in-stock: total available across all stores > 0. Dedup per day.
        if (row.totalAvailable > 0) {
          const inserted = await this.notifications.create({
            recipientUserId: recipient,
            kind: "wishlist_back_in_stock",
            title: "Item de wishlist disponible",
            body: `${row.productTitle} está en stock para ${customerName}.`,
            actionUrl: `/customers/${row.customerId}/wishlist`,
            customerId: row.customerId,
            productId: row.productId,
            groupKey: `wishlist_back_in_stock:${row.customerId}:${row.productId}:${today}`,
          });
          if (inserted) dispatchedBackInStock++;
        }

        // Price drop: compareAtPrice exists and current price is lower.
        const price = row.price ? Number(row.price) : null;
        const cmp = row.compareAtPrice ? Number(row.compareAtPrice) : null;
        if (price != null && cmp != null && price < cmp) {
          const pct = Math.round(((cmp - price) / cmp) * 100);
          const inserted = await this.notifications.create({
            recipientUserId: recipient,
            kind: "wishlist_price_drop",
            title: "Item de wishlist en promoción",
            body: `${row.productTitle} bajó ${pct}% para ${customerName}.`,
            actionUrl: `/customers/${row.customerId}/wishlist`,
            customerId: row.customerId,
            productId: row.productId,
            groupKey: `wishlist_price_drop:${row.customerId}:${row.productId}:${today}`,
          });
          if (inserted) dispatchedPriceDrop++;
        }
      }

      if (dispatchedBackInStock + dispatchedPriceDrop > 0) {
        this.logger.log(
          `Wishlist alerts: back_in_stock=${dispatchedBackInStock} price_drop=${dispatchedPriceDrop}`,
        );
      }
  }
}
