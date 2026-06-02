import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { eq, and } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  beautyProfiles,
  shadeMatches,
  brands,
  products,
  productVariants,
} from "@loreal/database";
import { findMatchingShades, type ShadeRecord } from "@loreal/domain";
import type {
  UpsertBeautyProfileDto,
  CreateShadeMatchDto,
} from "../../dtos/beauty.dto";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";
import {
  EmbeddingEvents,
  type CustomerChangedEvent,
} from "../ai/embedding-events";

@Injectable()
export class BeautyService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
    private readonly eventBus: EventEmitter2,
  ) {}

  async findProfile(customerId: string, user?: SessionUser) {
    if (user) await this.scopeService.assertCustomerAccess(customerId, user);

    const [profile] = await this.db
      .select()
      .from(beautyProfiles)
      .where(eq(beautyProfiles.customerId, customerId));

    if (!profile) return null;

    const shadeRows = await this.db
      .select({
        shade: shadeMatches,
        productName: products.title,
        brandName: brands.displayName,
        swatchHex: productVariants.swatchHex,
      })
      .from(shadeMatches)
      .leftJoin(products, eq(shadeMatches.productId, products.id))
      .leftJoin(brands, eq(shadeMatches.brandId, brands.id))
      .leftJoin(
        productVariants,
        and(
          eq(productVariants.productId, shadeMatches.productId),
          eq(productVariants.option1, shadeMatches.shadeCode),
        ),
      )
      .where(eq(shadeMatches.beautyProfileId, profile.id));

    const shades = shadeRows.map((row) => ({
      ...row.shade,
      productName: row.productName,
      brandName: row.brandName,
      swatchHex: row.swatchHex ?? null,
    }));

    return { ...profile, shades };
  }

  async upsertProfile(
    data: UpsertBeautyProfileDto & { customerId: string },
    user: SessionUser,
  ) {
    await this.scopeService.assertCustomerAccess(data.customerId, user);

    const [existing] = await this.db
      .select()
      .from(beautyProfiles)
      .where(eq(beautyProfiles.customerId, data.customerId));

    if (existing) {
      const { customerId, ...updateData } = data;
      const [updated] = await this.db
        .update(beautyProfiles)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(beautyProfiles.id, existing.id))
        .returning();
      this.emitCustomerChanged(data.customerId, "beauty_profile_updated");
      return updated;
    }

    const [created] = await this.db
      .insert(beautyProfiles)
      .values(data)
      .returning();
    this.emitCustomerChanged(data.customerId, "beauty_profile_created");
    return created;
  }

  private emitCustomerChanged(customerId: string, reason: string): void {
    const payload: CustomerChangedEvent = { customerId, reason };
    this.eventBus.emit(EmbeddingEvents.CUSTOMER_CHANGED, payload);
  }

  async addShade(
    data: CreateShadeMatchDto,
    customerId: string,
    user: SessionUser,
  ) {
    await this.scopeService.assertCustomerAccess(customerId, user);

    // The shade lives under the customer's beauty profile. If the profile
    // doesn't exist yet (BA tracking shades before doing the full quiz),
    // create a blank one so we always have a parent row to attach to.
    let [profile] = await this.db
      .select({ id: beautyProfiles.id })
      .from(beautyProfiles)
      .where(eq(beautyProfiles.customerId, customerId));

    if (!profile) {
      [profile] = await this.db
        .insert(beautyProfiles)
        .values({ customerId })
        .returning({ id: beautyProfiles.id });
    }

    const [shade] = await this.db
      .insert(shadeMatches)
      .values({
        beautyProfileId: profile.id,
        category: data.category,
        brandId: data.brandId,
        productId: data.productId,
        shadeCode: data.shadeCode,
        capturedByUserId: user.id,
        capturedAt: new Date(),
      })
      .returning();
    return shade;
  }

  async getShadeMatches(
    customerId: string,
    category: string,
    brandId?: string,
    user?: SessionUser,
  ) {
    if (user) await this.scopeService.assertCustomerAccess(customerId, user);

    const profile = await this.findProfile(customerId);
    if (!profile) throw new NotFoundException("Beauty profile not found");

    const currentShades: ShadeRecord[] = (profile.shades ?? []).map((s) => ({
      productId: s.productId,
      brandId: s.brandId,
      shadeCode: s.shadeCode,
      category: s.category as ShadeRecord["category"],
      skinTone: profile.skinTone as ShadeRecord["skinTone"],
      undertone: profile.undertone as ShadeRecord["undertone"],
    }));

    // Get available shades from product variants (filtered by category and
    // optionally brand). productVariants holds the per-shade rows; option1 is
    // the shade name and swatchHex is the rendered hex.
    const productConditions = [
      eq(products.status, "active"),
      eq(products.category, category),
    ];
    if (brandId) productConditions.push(eq(products.brandId, brandId));

    const variantRows = await this.db
      .select({
        productId: products.id,
        brandId: products.brandId,
        category: products.category,
        shadeCode: productVariants.option1,
      })
      .from(products)
      .innerJoin(productVariants, eq(productVariants.productId, products.id))
      .where(and(...productConditions));

    const availableShades: ShadeRecord[] = variantRows
      .filter((v) => v.shadeCode !== null)
      .map((v) => ({
        productId: v.productId,
        brandId: v.brandId,
        shadeCode: v.shadeCode as string,
        category: v.category as ShadeRecord["category"],
        skinTone: profile.skinTone as ShadeRecord["skinTone"],
        undertone: profile.undertone as ShadeRecord["undertone"],
      }));

    return findMatchingShades({
      targetCategory: category as ShadeRecord["category"],
      customerSkinTone: profile.skinTone as ShadeRecord["skinTone"],
      customerUndertone: profile.undertone as ShadeRecord["undertone"],
      currentShades,
      availableShades,
      targetBrandId: brandId,
    });
  }
}
