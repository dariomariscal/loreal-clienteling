import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { brands, brandConfigs } from "@loreal/database";
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
        active: brands.isActive,
        createdAt: brands.createdAt,
        updatedAt: brands.updatedAt,
        logoUrl: brandConfigs.logoUrl,
        primaryColor: brandConfigs.primaryColor,
        accentColor: brandConfigs.accentColor,
      })
      .from(brands)
      .leftJoin(brandConfigs, eq(brandConfigs.brandId, brands.id));

    if (user.role === "admin") return base;
    const brandId = this.scopeService.assertBrand(user);
    return base.where(eq(brands.id, brandId));
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

  async create(data: { code: string; displayName: string; tier: string; logoUrl?: string }) {
    const [brand] = await this.db.insert(brands).values(data).returning();
    return brand;
  }

  async update(id: string, data: Partial<{ code: string; displayName: string; tier: string; logoUrl: string; active: boolean }>) {
    const [brand] = await this.db
      .update(brands)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(brands.id, id))
      .returning();
    if (!brand) throw new NotFoundException("Brand not found");
    return brand;
  }

  async upsertConfig(brandId: string, data: Record<string, any>) {
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
