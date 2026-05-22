import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, and, type SQL } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import {
  beautyProfiles,
  beautyProfileShades,
  brands,
  products,
} from "@loreal/database";
import { findMatchingShades } from "@loreal/domain";
import type { UpsertBeautyProfileDto, CreateShadeDto } from "../../dtos/beauty.dto";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";

// Pull a hex from product.shadeOptions. Same contract as the shade picker:
// `{ shades: [{ code, hex }] }`. Anything else returns undefined.
function extractShadeHex(raw: unknown, shadeCode: string): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const shades = (raw as Record<string, unknown>).shades;
  if (!Array.isArray(shades)) return undefined;
  for (const s of shades) {
    if (s && typeof s === "object") {
      const code = (s as Record<string, unknown>).code;
      const hex = (s as Record<string, unknown>).hex;
      if (code === shadeCode && typeof hex === "string") return hex;
    }
  }
  return undefined;
}

@Injectable()
export class BeautyService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
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
        shade: beautyProfileShades,
        productName: products.name,
        productShadeOptions: products.shadeOptions,
        brandName: brands.displayName,
      })
      .from(beautyProfileShades)
      .leftJoin(products, eq(beautyProfileShades.productId, products.id))
      .leftJoin(brands, eq(beautyProfileShades.brandId, brands.id))
      .where(eq(beautyProfileShades.beautyProfileId, profile.id));

    const shades = shadeRows.map((row) => ({
      ...row.shade,
      productName: row.productName,
      brandName: row.brandName,
      swatchHex:
        extractShadeHex(row.productShadeOptions, row.shade.shadeCode) ?? null,
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
      return updated;
    }

    const [created] = await this.db
      .insert(beautyProfiles)
      .values(data)
      .returning();
    return created;
  }

  async addShade(data: CreateShadeDto, customerId: string, user: SessionUser) {
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
      .insert(beautyProfileShades)
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

    const currentShades = (profile.shades ?? []).map((s) => ({
      productId: s.productId,
      brandId: s.brandId,
      shadeCode: s.shadeCode,
      category: s.category as any,
      skinTone: profile.skinTone as any,
      skinSubtone: profile.skinSubtone as any,
    }));

    // Get available shades from products (filtered by category and optionally brand)
    const productConditions = [
      eq(products.active, true),
      eq(products.category, category),
    ];
    if (brandId) productConditions.push(eq(products.brandId, brandId));

    const filteredProducts = await this.db
      .select()
      .from(products)
      .where(and(...productConditions));

    const availableShades = filteredProducts.flatMap((p) => {
      const opts = p.shadeOptions as any[];
      if (!Array.isArray(opts)) return [];
      return opts.map((opt: any) => ({
        productId: p.id,
        brandId: p.brandId,
        shadeCode: opt.shadeCode ?? opt.code,
        category: p.category as any,
        skinTone: opt.skinTone as any,
        skinSubtone: opt.skinSubtone as any,
      }));
    });

    return findMatchingShades({
      targetCategory: category as any,
      customerSkinTone: profile.skinTone as any,
      customerSkinSubtone: profile.skinSubtone as any,
      currentShades,
      availableShades,
      targetBrandId: brandId,
    });
  }
}
