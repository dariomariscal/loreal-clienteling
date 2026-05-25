import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, and, ilike, or, inArray } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { products, inventoryLevels, brands } from "@loreal/database";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { ProductEmbeddingService } from "../ai/services/product-embedding.service";
import type {
  BulkCreateProductsDto,
  CreateProductDto,
  UpdateProductDto,
  ProductFiltersDto,
} from "../../dtos/products.dto";

export interface BulkImportRowResult {
  index: number;
  sku: string;
  status: "inserted" | "skipped" | "failed";
  productId?: string;
  error?: string;
}

export interface BulkImportResult {
  inserted: number;
  failed: number;
  rows: BulkImportRowResult[];
}

@Injectable()
export class ProductsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    private readonly productEmbeddings: ProductEmbeddingService,
  ) {}

  async findAll(user: SessionUser, filters: ProductFiltersDto) {
    const brandScope = this.scopeService.scopeByBrand(user, products.brandId);

    const conditions = [
      eq(products.status, "active"),
      ...(brandScope ? [brandScope] : []),
      ...(filters.category ? [eq(products.category, filters.category)] : []),
      ...(filters.search
        ? [or(ilike(products.title, `%${filters.search}%`), ilike(products.sku, `%${filters.search}%`))]
        : []),
    ];

    const where = conditions.length > 1 ? and(...conditions) : conditions[0];

    const rows = await this.db
      .select({
        product: products,
        brand: brands,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(where)
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit);

    return rows.map((r) => ({ ...r.product, brand: r.brand }));
  }

  async findOne(id: string) {
    const [row] = await this.db
      .select({
        product: products,
        brand: brands,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(eq(products.id, id));
    if (!row) throw new NotFoundException("Product not found");
    return { ...row.product, brand: row.brand };
  }

  async create(data: CreateProductDto) {
    const [product] = await this.db
      .insert(products)
      .values({
        ...data,
        price: String(data.price),
      })
      .returning();
    this.productEmbeddings.embedProductInBackground(product.id);
    return product;
  }

  /**
   * Bulk insert products. Pre-validates brand FKs and SKU uniqueness
   * (within the batch and against the database) before touching the
   * products table so callers get actionable per-row errors.
   *
   * - `atomic` (default): aborts the whole batch if any row would fail.
   * - `best_effort`: inserts valid rows and returns failures inline.
   */
  async bulkCreate(dto: BulkCreateProductsDto): Promise<BulkImportResult> {
    const mode = dto.mode ?? "atomic";
    const rows = dto.products;

    const rowResults: BulkImportRowResult[] = rows.map((p, i) => ({
      index: i,
      sku: p.sku,
      status: "failed",
    }));

    // 1. Duplicate SKU detection within the batch
    const seenSkus = new Map<string, number>();
    rows.forEach((row, i) => {
      const sku = row.sku.trim();
      if (seenSkus.has(sku)) {
        rowResults[i] = {
          index: i,
          sku,
          status: "failed",
          error: `Duplicate SKU within batch (also at row ${seenSkus.get(sku)! + 1})`,
        };
      } else {
        seenSkus.set(sku, i);
      }
    });

    // 2. Brand FK validation — single query for all referenced brands
    const referencedBrandIds = Array.from(
      new Set(rows.map((r) => r.brandId).filter(Boolean)),
    );
    const existingBrandIds = new Set<string>();
    if (referencedBrandIds.length > 0) {
      const found = await this.db
        .select({ id: brands.id })
        .from(brands)
        .where(inArray(brands.id, referencedBrandIds));
      for (const b of found) existingBrandIds.add(b.id);
    }
    rows.forEach((row, i) => {
      if (rowResults[i].error) return;
      if (!existingBrandIds.has(row.brandId)) {
        rowResults[i] = {
          index: i,
          sku: row.sku,
          status: "failed",
          error: `Brand not found: ${row.brandId}`,
        };
      }
    });

    // 3. Existing SKU detection — single query
    const candidateSkus = rows
      .filter((_, i) => !rowResults[i].error)
      .map((r) => r.sku);
    if (candidateSkus.length > 0) {
      const existing = await this.db
        .select({ sku: products.sku })
        .from(products)
        .where(inArray(products.sku, candidateSkus));
      const existingSkus = new Set(existing.map((p) => p.sku));
      rows.forEach((row, i) => {
        if (rowResults[i].error) return;
        if (existingSkus.has(row.sku)) {
          rowResults[i] = {
            index: i,
            sku: row.sku,
            status: "failed",
            error: "SKU already exists",
          };
        }
      });
    }

    const failedRows = rowResults.filter((r) => r.error);
    const insertable = rows
      .map((row, i) => ({ row, i }))
      .filter(({ i }) => !rowResults[i].error);

    // Atomic mode: if anything failed, abort without writing anything
    if (mode === "atomic" && failedRows.length > 0) {
      return {
        inserted: 0,
        failed: failedRows.length,
        rows: rowResults.map((r) => (r.error ? r : { ...r, status: "skipped" })),
      };
    }

    if (insertable.length === 0) {
      return {
        inserted: 0,
        failed: failedRows.length,
        rows: rowResults,
      };
    }

    // 4. Insert in a single transaction; on best_effort we still wrap in a
    //    transaction so DB-level errors (e.g. concurrent SKU collision) roll
    //    back the whole batch and we surface them per-row.
    try {
      await this.db.transaction(async (tx) => {
        const inserted = await tx
          .insert(products)
          .values(
            insertable.map(({ row }) => ({
              sku: row.sku,
              title: row.title,
              brandId: row.brandId,
              category: row.category,
              subcategory: row.subcategory ?? null,
              description: row.description ?? null,
              price: String(row.price),
              replenishmentDays: row.replenishmentDays ?? null,
            })),
          )
          .returning({ id: products.id, sku: products.sku });

        const idBySku = new Map(inserted.map((p) => [p.sku, p.id]));
        for (const { i, row } of insertable) {
          const id = idBySku.get(row.sku);
          rowResults[i] = {
            index: i,
            sku: row.sku,
            status: "inserted",
            productId: id,
          };
          if (id) this.productEmbeddings.embedProductInBackground(id);
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Insert failed";
      for (const { i, row } of insertable) {
        rowResults[i] = {
          index: i,
          sku: row.sku,
          status: "failed",
          error: message,
        };
      }
      return {
        inserted: 0,
        failed: rowResults.filter((r) => r.status === "failed").length,
        rows: rowResults,
      };
    }

    return {
      inserted: rowResults.filter((r) => r.status === "inserted").length,
      failed: rowResults.filter((r) => r.status === "failed").length,
      rows: rowResults,
    };
  }

  async update(id: string, data: UpdateProductDto) {
    const { price, ...rest } = data;
    const [product] = await this.db
      .update(products)
      .set({
        ...rest,
        ...(price !== undefined ? { price: String(price) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();
    if (!product) throw new NotFoundException("Product not found");
    // Regenerate the embedding only when content that feeds it changed.
    const embeddingFields: (keyof UpdateProductDto)[] = [
      "title",
      "description",
      "category",
      "subcategory",
    ];
    if (embeddingFields.some((f) => f in data)) {
      this.productEmbeddings.embedProductInBackground(product.id);
    }
    return product;
  }

  async getAvailability(productId: string, user: SessionUser) {
    const scope = await this.scopeService.scopeByStore(user, inventoryLevels.storeId);
    const conditions = [eq(inventoryLevels.productId, productId)];
    if (scope) conditions.push(scope);

    return this.db
      .select()
      .from(inventoryLevels)
      .where(and(...conditions));
  }

  async updateAvailability(productId: string, storeId: string, stockStatus: string) {
    const [existing] = await this.db
      .select()
      .from(inventoryLevels)
      .where(and(eq(inventoryLevels.productId, productId), eq(inventoryLevels.storeId, storeId)));

    if (existing) {
      const [updated] = await this.db
        .update(inventoryLevels)
        .set({ stockStatus, lastSyncedAt: new Date() })
        .where(eq(inventoryLevels.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(inventoryLevels)
      .values({ productId, storeId, stockStatus })
      .returning();
    return created;
  }
}
