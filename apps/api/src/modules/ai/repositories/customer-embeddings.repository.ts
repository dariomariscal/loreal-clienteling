import { Injectable, Inject } from "@nestjs/common";
import { sql, eq, and, inArray, ne, gt, notInArray } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import {
  customerEmbeddings,
  noteEmbeddings,
  customers,
  orders,
  lineItems,
  inventoryLevels,
  products,
} from "@loreal/database";

export interface UpsertEmbeddingInput {
  id: string;
  embedding: number[];
  model: string;
}

export interface VectorSearchHit {
  customerId: string;
  similarity: number;
  firstName: string;
  lastName: string;
}

@Injectable()
export class CustomerEmbeddingsRepository {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async upsertCustomer(input: UpsertEmbeddingInput): Promise<void> {
    await this.db
      .insert(customerEmbeddings)
      .values({
        customerId: input.id,
        embedding: input.embedding,
        model: input.model,
      })
      .onConflictDoUpdate({
        target: customerEmbeddings.customerId,
        set: {
          embedding: input.embedding,
          model: input.model,
          generatedAt: new Date(),
        },
      });
  }

  async upsertNote(input: UpsertEmbeddingInput): Promise<void> {
    await this.db
      .insert(noteEmbeddings)
      .values({
        noteId: input.id,
        embedding: input.embedding,
        model: input.model,
      })
      .onConflictDoUpdate({
        target: noteEmbeddings.noteId,
        set: {
          embedding: input.embedding,
          model: input.model,
          generatedAt: new Date(),
        },
      });
  }

  /**
   * Cosine-distance nearest-neighbor over customer profile embeddings.
   * Returns `similarity` in 0..1 (1 = identical) so the UI can sort and
   * threshold without knowing the metric.
   */
  async searchCustomers(
    queryVector: number[],
    limit: number,
  ): Promise<VectorSearchHit[]> {
    const vectorLiteral = `[${queryVector.join(",")}]`;
    const rows = await this.db
      .select({
        customerId: customerEmbeddings.customerId,
        distance: sql<number>`${customerEmbeddings.embedding} <=> ${vectorLiteral}::vector`,
        firstName: customers.firstName,
        lastName: customers.lastName,
      })
      .from(customerEmbeddings)
      .innerJoin(customers, eq(customers.id, customerEmbeddings.customerId))
      .orderBy(sql`${customerEmbeddings.embedding} <=> ${vectorLiteral}::vector`)
      .limit(limit);

    return rows.map((r) => ({
      customerId: r.customerId,
      similarity: 1 - Number(r.distance),
      firstName: r.firstName,
      lastName: r.lastName,
    }));
  }

  /**
   * Returns the embedding vector for a single customer, or `null` if it
   * hasn't been generated yet. Consumed by the recommendation engine to seed
   * the customer-to-product semantic search.
   */
  async findVectorByCustomerId(customerId: string): Promise<number[] | null> {
    const rows = await this.db
      .select({ embedding: customerEmbeddings.embedding })
      .from(customerEmbeddings)
      .where(eq(customerEmbeddings.customerId, customerId))
      .limit(1);
    return rows[0]?.embedding ?? null;
  }

  /**
   * Look-alike retrieval: the top-N customer IDs whose embedding is closest to
   * the seed customer's. Excludes the seed customer itself.
   *
   * The engine uses these IDs to aggregate purchase history into a
   * collaborative-filtering candidate list.
   */
  async findLookalikeCustomerIds(
    seedCustomerId: string,
    limit: number,
  ): Promise<Array<{ customerId: string; similarity: number }>> {
    const seedVector = await this.findVectorByCustomerId(seedCustomerId);
    if (!seedVector) return [];

    const vectorLiteral = `[${seedVector.join(",")}]`;
    const rows = await this.db
      .select({
        customerId: customerEmbeddings.customerId,
        distance: sql<number>`${customerEmbeddings.embedding} <=> ${vectorLiteral}::vector`,
      })
      .from(customerEmbeddings)
      .where(ne(customerEmbeddings.customerId, seedCustomerId))
      .orderBy(sql`${customerEmbeddings.embedding} <=> ${vectorLiteral}::vector`)
      .limit(limit);

    return rows.map((r) => ({
      customerId: r.customerId,
      similarity: 1 - Number(r.distance),
    }));
  }

  /**
   * Aggregates products purchased by a set of look-alike customers, ranked
   * by purchase frequency. Only returns products that:
   *   - the target customer has NOT bought,
   *   - have stock available in the target store,
   *   - belong to an active SKU.
   *
   * `purchaseCount` is normalised to 0..1 by the caller — the repository
   * returns raw counts so the caller can choose its own normalisation.
   */
  async aggregateLookalikePurchases(input: {
    lookalikeCustomerIds: string[];
    excludeProductIds: string[];
    storeId: string;
    brandId: string;
    limit: number;
  }): Promise<Array<{ productId: string; purchaseCount: number }>> {
    if (input.lookalikeCustomerIds.length === 0) return [];

    const conditions = [
      inArray(orders.customerId, input.lookalikeCustomerIds),
      eq(products.status, "active"),
      eq(products.brandId, input.brandId),
      eq(inventoryLevels.storeId, input.storeId),
      gt(inventoryLevels.availableQuantity, 0),
      ...(input.excludeProductIds.length > 0
        ? [notInArray(lineItems.productId, input.excludeProductIds)]
        : []),
    ];

    const rows = await this.db
      .select({
        productId: lineItems.productId,
        purchaseCount: sql<number>`COUNT(*)::int`,
      })
      .from(lineItems)
      .innerJoin(orders, eq(orders.id, lineItems.orderId))
      .innerJoin(products, eq(products.id, lineItems.productId))
      .innerJoin(
        inventoryLevels,
        eq(inventoryLevels.productId, products.id),
      )
      .where(and(...conditions))
      .groupBy(lineItems.productId)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(input.limit);

    return rows.map((r) => ({
      productId: r.productId,
      purchaseCount: Number(r.purchaseCount),
    }));
  }
}
