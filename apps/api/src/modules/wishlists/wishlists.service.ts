import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, and, desc, inArray, isNull } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  wishlists,
  wishlistItems,
  products,
  productVariants,
  brands,
} from "@loreal/database";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import { AuditService } from "../../common/services/audit.service";
import type {
  CreateWishlistDto,
  UpdateWishlistDto,
  ShareWishlistDto,
  AddWishlistItemDto,
  UpdateWishlistItemDto,
} from "../../dtos/wishlists.dto";

@Injectable()
export class WishlistsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    @Inject(AuditService) private auditService: AuditService,
  ) {}

  async findByCustomer(customerId: string, user: SessionUser) {
    await this.scopeService.assertCustomerAccess(customerId, user);

    const lists = await this.db
      .select()
      .from(wishlists)
      .where(eq(wishlists.customerId, customerId))
      .orderBy(desc(wishlists.updatedAt));

    if (lists.length === 0) return [];

    const enriched = await this.enrichItems(lists.map((l) => l.id));

    const grouped = new Map<string, typeof enriched>();
    for (const list of lists) grouped.set(list.id, []);
    for (const item of enriched) {
      grouped.get(item.wishlistId)?.push(item);
    }

    return lists.map((list) => ({ ...list, items: grouped.get(list.id) ?? [] }));
  }

  async findOne(id: string, user: SessionUser) {
    const [list] = await this.db
      .select()
      .from(wishlists)
      .where(eq(wishlists.id, id));
    if (!list) throw new NotFoundException("Wishlist not found");

    await this.scopeService.assertCustomerAccess(list.customerId, user);

    const items = await this.enrichItems([id]);
    return { ...list, items };
  }

  /**
   * Resolve wishlist_items into display-ready rows by joining the product,
   * its variant (when present) and the brand. The image follows the same
   * variant→product fallback the scanner uses (see ProductLookupService) so
   * the wishlist UI never shows a blank thumbnail when only the master
   * product has artwork — which is our reality today since variants ship
   * without imageUrl in seed and in the live catalog.
   *
   * Returns rows ordered by (wishlistId asc, position asc) so the caller can
   * group cheaply with a single pass.
   */
  private async enrichItems(wishlistIds: string[]) {
    if (wishlistIds.length === 0) return [];
    const rows = await this.db
      .select({
        item: wishlistItems,
        product: products,
        variant: productVariants,
        brand: brands,
      })
      .from(wishlistItems)
      .innerJoin(products, eq(products.id, wishlistItems.productId))
      .innerJoin(brands, eq(brands.id, products.brandId))
      .leftJoin(
        productVariants,
        eq(productVariants.id, wishlistItems.variantId),
      )
      .where(inArray(wishlistItems.wishlistId, wishlistIds))
      .orderBy(wishlistItems.wishlistId, wishlistItems.position);

    return rows.map((r) => ({
      id: r.item.id,
      wishlistId: r.item.wishlistId,
      productId: r.item.productId,
      variantId: r.item.variantId,
      note: r.item.note,
      position: r.item.position,
      addedAt: r.item.addedAt,
      product: {
        id: r.product.id,
        title: r.product.title,
        category: r.product.category,
        subcategory: r.product.subcategory,
        imageUrl: this.firstProductImage(r.product.images),
        brand: {
          id: r.brand.id,
          code: r.brand.code,
          displayName: r.brand.displayName,
        },
      },
      variant: r.variant
        ? {
            id: r.variant.id,
            sku: r.variant.sku,
            title: r.variant.title,
            optionLabel: this.collapseOptions(r.variant),
            price: Number(r.variant.price),
            // Variant artwork is sparse — fall back to the product's hero
            // image so the wishlist card always renders something.
            imageUrl:
              r.variant.imageUrl ?? this.firstProductImage(r.product.images),
            swatchHex: r.variant.swatchHex,
          }
        : null,
    }));
  }

  private firstProductImage(images: unknown): string | null {
    if (!Array.isArray(images) || images.length === 0) return null;
    const first = images[0];
    return typeof first === "string" && first.length > 0 ? first : null;
  }

  private collapseOptions(v: {
    option1: string | null;
    option2: string | null;
    option3: string | null;
  }): string | null {
    return [v.option1, v.option2, v.option3].filter(Boolean).join(" · ") || null;
  }

  async create(data: CreateWishlistDto, user: SessionUser) {
    await this.scopeService.assertCustomerAccess(data.customerId, user);

    const [list] = await this.db
      .insert(wishlists)
      .values({
        customerId: data.customerId,
        createdByUserId: user.id,
        name: data.name,
        kind: data.kind ?? "wishlist",
        description: data.description,
      })
      .returning();

    if (data.items?.length) {
      await this.db.insert(wishlistItems).values(
        data.items.map((item, idx) => ({
          wishlistId: list.id,
          productId: item.productId,
          variantId: item.variantId,
          note: item.note,
          position: item.position ?? idx,
        })),
      );
    }

    await this.auditService.log(user, "create", "wishlist", list.id, {
      customerId: data.customerId,
      itemCount: data.items?.length ?? 0,
    });

    return this.findOne(list.id, user);
  }

  async update(id: string, data: UpdateWishlistDto, user: SessionUser) {
    const existing = await this.findOne(id, user);

    const [updated] = await this.db
      .update(wishlists)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        updatedAt: new Date(),
      })
      .where(eq(wishlists.id, id))
      .returning();

    await this.auditService.log(user, "update", "wishlist", id, {
      customerId: existing.customerId,
    });

    return updated;
  }

  async remove(id: string, user: SessionUser) {
    const existing = await this.findOne(id, user);

    await this.db.delete(wishlists).where(eq(wishlists.id, id));

    await this.auditService.log(user, "delete", "wishlist", id, {
      customerId: existing.customerId,
    });

    return { id, deleted: true };
  }

  async share(id: string, data: ShareWishlistDto, user: SessionUser) {
    const existing = await this.findOne(id, user);

    const [updated] = await this.db
      .update(wishlists)
      .set({
        sharedAt: new Date(),
        sharedVia: data.channel,
        updatedAt: new Date(),
      })
      .where(eq(wishlists.id, id))
      .returning();

    await this.auditService.log(user, "share", "wishlist", id, {
      customerId: existing.customerId,
      channel: data.channel,
    });

    return updated;
  }

  async addItem(wishlistId: string, data: AddWishlistItemDto, user: SessionUser) {
    await this.findOne(wishlistId, user);

    // Dedup: same product+variant inside a wishlist collapses to one row.
    // The Postgres partial-unique would also enforce this, but we check up
    // front so we can return the existing item with `alreadyExists: true`
    // — the scanner uses that signal to show "ya está en wishlist" instead
    // of "agregado".
    const [existing] = await this.db
      .select()
      .from(wishlistItems)
      .where(
        and(
          eq(wishlistItems.wishlistId, wishlistId),
          eq(wishlistItems.productId, data.productId),
          data.variantId
            ? eq(wishlistItems.variantId, data.variantId)
            : isNull(wishlistItems.variantId),
        ),
      )
      .limit(1);

    if (existing) {
      return { ...existing, alreadyExists: true as const };
    }

    const [item] = await this.db
      .insert(wishlistItems)
      .values({
        wishlistId,
        productId: data.productId,
        variantId: data.variantId,
        note: data.note,
        position: data.position ?? 0,
      })
      .returning();

    await this.db
      .update(wishlists)
      .set({ updatedAt: new Date() })
      .where(eq(wishlists.id, wishlistId));

    return { ...item, alreadyExists: false as const };
  }

  async updateItem(
    wishlistId: string,
    itemId: string,
    data: UpdateWishlistItemDto,
    user: SessionUser,
  ) {
    await this.findOne(wishlistId, user);

    const [item] = await this.db
      .update(wishlistItems)
      .set({
        ...(data.note !== undefined && { note: data.note }),
        ...(data.position !== undefined && { position: data.position }),
      })
      .where(
        and(eq(wishlistItems.id, itemId), eq(wishlistItems.wishlistId, wishlistId)),
      )
      .returning();

    if (!item) throw new NotFoundException("Wishlist item not found");
    return item;
  }

  async removeItem(wishlistId: string, itemId: string, user: SessionUser) {
    await this.findOne(wishlistId, user);

    const [item] = await this.db
      .delete(wishlistItems)
      .where(
        and(eq(wishlistItems.id, itemId), eq(wishlistItems.wishlistId, wishlistId)),
      )
      .returning();

    if (!item) throw new NotFoundException("Wishlist item not found");
    return { id: itemId, deleted: true };
  }
}
