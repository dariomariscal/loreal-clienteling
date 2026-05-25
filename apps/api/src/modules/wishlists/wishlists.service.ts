import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, and, desc, inArray } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { wishlists, wishlistItems } from "@loreal/database";
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

    const items = await this.db
      .select()
      .from(wishlistItems)
      .where(inArray(wishlistItems.wishlistId, lists.map((l) => l.id)))
      .orderBy(wishlistItems.position);

    const grouped = new Map<string, typeof items>();
    for (const list of lists) grouped.set(list.id, []);
    for (const item of items) {
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

    const items = await this.db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.wishlistId, id))
      .orderBy(wishlistItems.position);

    return { ...list, items };
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

    return item;
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
