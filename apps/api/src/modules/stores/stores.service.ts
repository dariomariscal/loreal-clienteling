import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { stores, brandStores } from "@loreal/database";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";

type CreateStoreInput = {
  code: string;
  displayName: string;
  chain: string;
  zoneId?: string;
  address?: string;
  city?: string;
  state?: string;
  district?: string;
  municipalityId?: string;
  postcode?: string;
  lat?: number;
  lng?: number;
  brandIds?: string[];
};

type UpdateStoreInput = Partial<CreateStoreInput> & { active?: boolean };

@Injectable()
export class StoresService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

  async findAll(user: SessionUser) {
    const scope = await this.scopeService.scopeByStore(user, stores.id);
    if (scope) {
      return this.db.select().from(stores).where(scope);
    }
    return this.db.select().from(stores);
  }

  async findOne(id: string) {
    const [store] = await this.db
      .select()
      .from(stores)
      .where(eq(stores.id, id));
    if (!store) throw new NotFoundException("Store not found");

    const brandLinks = await this.db
      .select({ brandId: brandStores.brandId })
      .from(brandStores)
      .where(eq(brandStores.storeId, id));

    return { ...store, brandIds: brandLinks.map((b) => b.brandId) };
  }

  async create(data: CreateStoreInput) {
    const { brandIds, lat, lng, ...rest } = data;
    const [store] = await this.db
      .insert(stores)
      .values({
        ...rest,
        lat: lat !== undefined ? lat.toString() : undefined,
        lng: lng !== undefined ? lng.toString() : undefined,
      })
      .returning();

    if (brandIds && brandIds.length > 0) {
      await this.db
        .insert(brandStores)
        .values(brandIds.map((brandId) => ({ brandId, storeId: store.id })));
    }

    return { ...store, brandIds: brandIds ?? [] };
  }

  async update(id: string, data: UpdateStoreInput) {
    const { brandIds, lat, lng, ...rest } = data;
    const [store] = await this.db
      .update(stores)
      .set({
        ...rest,
        ...(lat !== undefined ? { lat: lat.toString() } : {}),
        ...(lng !== undefined ? { lng: lng.toString() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(stores.id, id))
      .returning();
    if (!store) throw new NotFoundException("Store not found");

    if (brandIds !== undefined) {
      await this.db.delete(brandStores).where(eq(brandStores.storeId, id));
      if (brandIds.length > 0) {
        await this.db
          .insert(brandStores)
          .values(brandIds.map((brandId) => ({ brandId, storeId: id })));
      }
    }

    return this.findOne(id);
  }
}
