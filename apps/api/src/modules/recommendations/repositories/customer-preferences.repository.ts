import { Injectable, Inject } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import {
  beautyProfiles,
  customers,
  customerRoutines,
  lineItems,
  orders,
  products,
} from "@loreal/database";
import type { CustomerPreferenceSnapshot } from "@loreal/contracts";

/**
 * Hydrates the {@link CustomerPreferenceSnapshot} the pure ranker needs.
 * Lives next to the engine (not under `customers/`) because it joins fields
 * specifically for ranking — keeping it here avoids over-loading the
 * customer module with engine-shaped query helpers.
 */
@Injectable()
export class CustomerPreferencesRepository {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async findSnapshot(
    customerId: string,
  ): Promise<CustomerPreferenceSnapshot | null> {
    const [customer] = await this.db
      .select({
        averageOrderValue: customers.averageOrderValue,
      })
      .from(customers)
      .where(eq(customers.id, customerId));
    if (!customer) return null;

    const [profile] = await this.db
      .select({
        skinConcerns: beautyProfiles.skinConcerns,
        preferredIngredients: beautyProfiles.preferredIngredients,
        avoidedIngredients: beautyProfiles.avoidedIngredients,
      })
      .from(beautyProfiles)
      .where(eq(beautyProfiles.customerId, customerId));

    const brandRows = await this.db
      .select({
        brandId: products.brandId,
        purchaseCount: sql<number>`COUNT(*)::int`,
      })
      .from(lineItems)
      .innerJoin(orders, eq(orders.id, lineItems.orderId))
      .innerJoin(products, eq(products.id, lineItems.productId))
      .where(eq(orders.customerId, customerId))
      .groupBy(products.brandId);

    const routineRows = await this.db
      .select({ productId: customerRoutines.productId })
      .from(customerRoutines)
      .where(eq(customerRoutines.customerId, customerId));

    const purchasedRows = await this.db
      .selectDistinct({ productId: lineItems.productId })
      .from(lineItems)
      .innerJoin(orders, eq(orders.id, lineItems.orderId))
      .where(eq(orders.customerId, customerId));

    return {
      customerId,
      skinConcerns: profile?.skinConcerns ?? [],
      preferredIngredients: profile?.preferredIngredients ?? [],
      avoidedIngredients: profile?.avoidedIngredients ?? [],
      brandAffinity: Object.fromEntries(
        brandRows.map((b) => [b.brandId, Number(b.purchaseCount)]),
      ),
      averageOrderValue: Number(customer.averageOrderValue),
      routineProductIds: routineRows
        .map((r) => r.productId)
        .filter((id): id is string => Boolean(id)),
      purchasedProductIds: purchasedRows.map((r) => r.productId),
    };
  }
}
