import { Injectable, Inject } from "@nestjs/common";
import { sql, eq, and, gt } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import {
  productEmbeddings,
  products,
  brands,
  inventoryLevels,
} from "@loreal/database";

export interface UpsertProductEmbeddingInput {
  productId: string;
  embedding: number[];
  model: string;
}

export interface ProductVectorHit {
  productId: string;
  sku: string;
  name: string;
  brandId: string;
  brandName: string | null;
  category: string;
  subcategory: string | null;
  price: string;
  similarity: number;
}

@Injectable()
export class ProductEmbeddingsRepository {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async upsert(input: UpsertProductEmbeddingInput): Promise<void> {
    await this.db
      .insert(productEmbeddings)
      .values({
        productId: input.productId,
        embedding: input.embedding,
        model: input.model,
      })
      .onConflictDoUpdate({
        target: productEmbeddings.productId,
        set: {
          embedding: input.embedding,
          model: input.model,
          generatedAt: new Date(),
        },
      });
  }

  /**
   * Cosine-distance nearest-neighbor over product embeddings. Returns
   * `similarity` in 0..1 (1 = identical). Only joins active products so the
   * caller doesn't have to re-filter.
   */
  async search(
    queryVector: number[],
    limit: number,
  ): Promise<ProductVectorHit[]> {
    const vectorLiteral = `[${queryVector.join(",")}]`;
    const rows = await this.db
      .select({
        productId: productEmbeddings.productId,
        distance: sql<number>`${productEmbeddings.embedding} <=> ${vectorLiteral}::vector`,
        sku: products.sku,
        name: products.title,
        brandId: products.brandId,
        brandName: brands.displayName,
        category: products.category,
        subcategory: products.subcategory,
        price: products.price,
      })
      .from(productEmbeddings)
      .innerJoin(products, eq(products.id, productEmbeddings.productId))
      .leftJoin(brands, eq(brands.id, products.brandId))
      .where(eq(products.status, "active"))
      .orderBy(sql`${productEmbeddings.embedding} <=> ${vectorLiteral}::vector`)
      .limit(limit);

    return rows.map((r) => ({
      productId: r.productId,
      sku: r.sku,
      name: r.name,
      brandId: r.brandId,
      brandName: r.brandName,
      category: r.category,
      subcategory: r.subcategory,
      price: r.price,
      similarity: 1 - Number(r.distance),
    }));
  }

  /**
   * Same vector search as {@link search} but additionally restricts the result
   * set to products with available stock in the given store. Used by the
   * recommendation engine so out-of-stock products never make it into the BA's
   * suggestions.
   */
  async searchInStockForStore(
    queryVector: number[],
    storeId: string,
    brandId: string,
    limit: number,
  ): Promise<ProductVectorHit[]> {
    const vectorLiteral = `[${queryVector.join(",")}]`;
    const rows = await this.db
      .select({
        productId: productEmbeddings.productId,
        distance: sql<number>`${productEmbeddings.embedding} <=> ${vectorLiteral}::vector`,
        sku: products.sku,
        name: products.title,
        brandId: products.brandId,
        brandName: brands.displayName,
        category: products.category,
        subcategory: products.subcategory,
        price: products.price,
      })
      .from(productEmbeddings)
      .innerJoin(products, eq(products.id, productEmbeddings.productId))
      .innerJoin(
        inventoryLevels,
        and(
          eq(inventoryLevels.productId, products.id),
          eq(inventoryLevels.storeId, storeId),
          gt(inventoryLevels.availableQuantity, 0),
        ),
      )
      .leftJoin(brands, eq(brands.id, products.brandId))
      .where(
        and(
          eq(products.status, "active"),
          eq(products.brandId, brandId),
        ),
      )
      .orderBy(sql`${productEmbeddings.embedding} <=> ${vectorLiteral}::vector`)
      .limit(limit);

    return rows.map((r) => ({
      productId: r.productId,
      sku: r.sku,
      name: r.name,
      brandId: r.brandId,
      brandName: r.brandName,
      category: r.category,
      subcategory: r.subcategory,
      price: r.price,
      similarity: 1 - Number(r.distance),
    }));
  }
}
