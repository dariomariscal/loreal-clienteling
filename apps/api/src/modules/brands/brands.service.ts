import { Injectable, Inject, NotFoundException, ForbiddenException } from "@nestjs/common";
import { eq, inArray } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { brands, brandConfigs } from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";

@Injectable()
export class BrandsService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  async findAll(user: SessionUser) {
    const base = this.db
      .select({
        id: brands.id,
        code: brands.code,
        displayName: brands.displayName,
        tier: brands.tier,
        divisionId: brands.divisionId,
        active: brands.isActive,
        createdAt: brands.createdAt,
        updatedAt: brands.updatedAt,
        logoUrl: brandConfigs.logoUrl,
        primaryColor: brandConfigs.primaryColor,
        accentColor: brandConfigs.accentColor,
      })
      .from(brands)
      .leftJoin(brandConfigs, eq(brandConfigs.brandId, brands.id));

    if (user.role === UserRole.ADMIN) return base;

    // area_manager and national_retail_manager see every brand of their
    // division. The other roles are pinned to a single brand.
    if (
      user.role === UserRole.AREA_MANAGER ||
      user.role === UserRole.NATIONAL_RETAIL_MANAGER
    ) {
      const brandIds = await this.scopeService.getAccessibleBrandIds(user);
      if (brandIds.length === 0) return [];
      return base.where(inArray(brands.id, brandIds));
    }

    const brandId = this.scopeService.assertBrand(user);
    return base.where(eq(brands.id, brandId));
  }

  /**
   * Ensures the brand belongs to the user's scope before they mutate it.
   * Admin passes through; NRM is restricted to brands in their division; any
   * other role is denied.
   */
  private async assertBrandWritable(brandId: string, user: SessionUser) {
    if (user.role === UserRole.ADMIN) return;
    if (user.role !== UserRole.NATIONAL_RETAIL_MANAGER) {
      throw new ForbiddenException("Only admin or NRM may edit brands");
    }
    const accessible = await this.scopeService.getAccessibleBrandIds(user);
    if (!accessible.includes(brandId)) {
      throw new ForbiddenException("Brand is outside your division");
    }
  }

  async findOne(id: string) {
    const [brand] = await this.db
      .select()
      .from(brands)
      .where(eq(brands.id, id));
    if (!brand) throw new NotFoundException("Brand not found");

    const [config] = await this.db
      .select()
      .from(brandConfigs)
      .where(eq(brandConfigs.brandId, id));

    return { ...brand, config: config ?? null };
  }

  async create(
    data: { code: string; displayName: string; tier: string; logoUrl?: string; divisionId?: string },
    user: SessionUser,
  ) {
    // NRM may only create brands inside their own division. Force the
    // divisionId server-side so a malicious payload can't escape scope.
    let divisionId = data.divisionId;
    if (user.role === UserRole.NATIONAL_RETAIL_MANAGER) {
      divisionId = this.scopeService.assertDivision(user);
    } else if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Only admin or NRM may create brands");
    }

    const [brand] = await this.db
      .insert(brands)
      .values({ ...data, divisionId })
      .returning();
    return brand;
  }

  async update(
    id: string,
    data: Partial<{ code: string; displayName: string; tier: string; logoUrl: string; active: boolean; divisionId: string }>,
    user: SessionUser,
  ) {
    await this.assertBrandWritable(id, user);

    // NRM cannot move a brand into a different division
    const { divisionId, ...rest } = data;
    const updateValues: Record<string, unknown> = { ...rest, updatedAt: new Date() };
    if (divisionId !== undefined && user.role === UserRole.ADMIN) {
      updateValues.divisionId = divisionId;
    }

    const [brand] = await this.db
      .update(brands)
      .set(updateValues)
      .where(eq(brands.id, id))
      .returning();
    if (!brand) throw new NotFoundException("Brand not found");
    return brand;
  }

  async upsertConfig(brandId: string, data: Record<string, any>, user: SessionUser) {
    await this.assertBrandWritable(brandId, user);

    // Check brand exists
    await this.findOne(brandId);

    const [existing] = await this.db
      .select()
      .from(brandConfigs)
      .where(eq(brandConfigs.brandId, brandId));

    if (existing) {
      const [config] = await this.db
        .update(brandConfigs)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(brandConfigs.brandId, brandId))
        .returning();
      return config;
    }

    const [config] = await this.db
      .insert(brandConfigs)
      .values({ brandId, ...data })
      .returning();
    return config;
  }
}
