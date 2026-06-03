import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { brands, products, productVariants } from "@loreal/database";

/**
 * Public-facing slice of the catalog. No scope checks — this is the "client
 * picks up their phone and shows the BA" surface. Returns only the fields the
 * showroom UI renders (image, brand, title, variant SKU/barcode) so we never
 * leak supplier costs, internal flags, etc.
 *
 * The active filter is enforced server-side so a deactivated product can't be
 * surfaced even by crafting the URL — this is unauthenticated traffic.
 */
@Injectable()
export class PublicCatalogService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async list(params: { brand?: string; q?: string; limit?: number }) {
    const limit = Math.min(Math.max(params.limit ?? 60, 1), 200);
    const conditions = [eq(products.status, "active")];
    if (params.brand) {
      conditions.push(ilike(brands.code, params.brand));
    }
    if (params.q && params.q.trim().length > 0) {
      const needle = `%${params.q.trim()}%`;
      conditions.push(
        or(
          ilike(products.title, needle),
          ilike(products.sku, needle),
          ilike(brands.displayName, needle),
        )!,
      );
    }

    const rows = await this.db
      .select({
        id: products.id,
        sku: products.sku,
        title: products.title,
        category: products.category,
        images: products.images,
        brand: {
          id: brands.id,
          code: brands.code,
          displayName: brands.displayName,
        },
      })
      .from(products)
      .innerJoin(brands, eq(brands.id, products.brandId))
      .where(and(...conditions))
      .orderBy(asc(brands.displayName), asc(products.title))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      sku: r.sku,
      title: r.title,
      category: r.category,
      imageUrl: this.firstImage(r.images),
      brand: r.brand,
    }));
  }

  async findOne(productId: string) {
    const [row] = await this.db
      .select({
        product: products,
        brand: brands,
      })
      .from(products)
      .innerJoin(brands, eq(brands.id, products.brandId))
      .where(and(eq(products.id, productId), eq(products.status, "active")));

    if (!row) throw new NotFoundException("Product not found");

    const variants = await this.db
      .select()
      .from(productVariants)
      .where(
        and(
          eq(productVariants.productId, productId),
          eq(productVariants.isActive, true),
        ),
      )
      .orderBy(asc(productVariants.title));

    return {
      id: row.product.id,
      sku: row.product.sku,
      barcode: row.product.barcode,
      title: row.product.title,
      category: row.product.category,
      subcategory: row.product.subcategory,
      description: row.product.description,
      imageUrl: this.firstImage(row.product.images),
      images: Array.isArray(row.product.images)
        ? (row.product.images as string[]).filter(
            (s) => typeof s === "string" && s.length > 0,
          )
        : [],
      brand: {
        id: row.brand.id,
        code: row.brand.code,
        displayName: row.brand.displayName,
      },
      variants: variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        barcode: v.barcode,
        title: v.title,
        optionLabel: [v.option1, v.option2, v.option3]
          .filter(Boolean)
          .join(" · "),
        price: Number(v.price),
        imageUrl: v.imageUrl ?? this.firstImage(row.product.images),
        swatchHex: v.swatchHex,
      })),
    };
  }

  async listBrands() {
    const rows = await this.db
      .select({
        id: brands.id,
        code: brands.code,
        displayName: brands.displayName,
        productCount: sql<number>`count(${products.id})::int`,
      })
      .from(brands)
      .leftJoin(
        products,
        and(eq(products.brandId, brands.id), eq(products.status, "active")),
      )
      .groupBy(brands.id)
      .orderBy(asc(brands.displayName));
    return rows.filter((r) => r.productCount > 0);
  }

  private firstImage(images: unknown): string | null {
    if (!Array.isArray(images) || images.length === 0) return null;
    const first = images[0];
    return typeof first === "string" && first.length > 0 ? first : null;
  }
}
