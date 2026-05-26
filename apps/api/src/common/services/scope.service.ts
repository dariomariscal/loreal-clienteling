import { Injectable, Inject, ForbiddenException } from "@nestjs/common";
import { eq, inArray, sql, type SQL, type Column } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { stores, customers, brandStores, brands } from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../types/session";

@Injectable()
export class ScopeService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  /**
   * Returns a Drizzle WHERE condition that filters rows by the user's accessible stores.
   * Pass the storeId column of the table you're querying.
   *
   * Scope rules:
   *   admin                   → no filter (sees every store)
   *   national_retail_manager → every store of its division (multi-zone)
   *   area_manager            → stores in its zone that belong to its division
   *   counter_manager / ba    → single store
   */
  async scopeByStore(
    user: SessionUser,
    storeIdColumn: Column,
  ): Promise<SQL | undefined> {
    if (user.role === UserRole.ADMIN) return undefined;

    if (
      user.role === UserRole.AREA_MANAGER ||
      user.role === UserRole.NATIONAL_RETAIL_MANAGER
    ) {
      const storeIds = await this.getAccessibleStoreIds(user);
      if (storeIds.length === 0) return sql`false`;
      return inArray(storeIdColumn, storeIds);
    }

    // beauty_advisor and counter_manager: single store
    if (!user.storeId) throw new ForbiddenException("User has no store assigned");
    return eq(storeIdColumn, user.storeId);
  }

  /**
   * Returns a Drizzle WHERE condition that filters rows by the user's brand.
   *
   * For roles scoped by division (area_manager, national_retail_manager) this
   * returns IN (brands of that division). For brand-bound roles (BA, counter
   * manager) it pins the specific brand.
   */
  async scopeByBrand(
    user: SessionUser,
    brandIdColumn: Column,
  ): Promise<SQL | undefined> {
    if (user.role === UserRole.ADMIN) return undefined;

    if (
      user.role === UserRole.AREA_MANAGER ||
      user.role === UserRole.NATIONAL_RETAIL_MANAGER
    ) {
      const brandIds = await this.getAccessibleBrandIds(user);
      if (brandIds.length === 0) return sql`false`;
      return inArray(brandIdColumn, brandIds);
    }

    if (!user.brandId) throw new ForbiddenException("User has no brand assigned");
    return eq(brandIdColumn, user.brandId);
  }

  /**
   * Returns the list of store UUIDs accessible to the user.
   * Admin returns [] (the caller should interpret this as "no filter").
   *
   * area_manager            : stores in its zone whose brand belongs to its division
   * national_retail_manager : every store carrying any brand of its division
   */
  async getAccessibleStoreIds(user: SessionUser): Promise<string[]> {
    if (user.role === UserRole.ADMIN) return [];

    if (user.role === UserRole.NATIONAL_RETAIL_MANAGER) {
      if (!user.divisionId) {
        throw new ForbiddenException(
          "National Retail Manager has no division assigned",
        );
      }
      const result = await this.db
        .select({ id: stores.id })
        .from(stores)
        .innerJoin(brandStores, eq(brandStores.storeId, stores.id))
        .innerJoin(brands, eq(brands.id, brandStores.brandId))
        .where(sql`${brands.divisionId} = ${user.divisionId}`);
      return Array.from(new Set(result.map((r) => r.id)));
    }

    if (user.role === UserRole.AREA_MANAGER) {
      if (!user.zoneId)
        throw new ForbiddenException("Area Manager has no zone assigned");
      if (!user.divisionId)
        throw new ForbiddenException(
          "Area Manager has no division assigned",
        );
      const result = await this.db
        .select({ id: stores.id })
        .from(stores)
        .innerJoin(brandStores, eq(brandStores.storeId, stores.id))
        .innerJoin(brands, eq(brands.id, brandStores.brandId))
        .where(
          sql`${stores.zoneId} = ${user.zoneId} AND ${brands.divisionId} = ${user.divisionId}`,
        );
      return Array.from(new Set(result.map((r) => r.id)));
    }

    // beauty_advisor / counter_manager
    if (!user.storeId) throw new ForbiddenException("User has no store assigned");
    return [user.storeId];
  }

  /**
   * Returns the list of brand UUIDs accessible to the user. For division-
   * scoped roles this is every brand of that division.
   */
  async getAccessibleBrandIds(user: SessionUser): Promise<string[]> {
    if (user.role === UserRole.ADMIN) return [];

    if (
      user.role === UserRole.AREA_MANAGER ||
      user.role === UserRole.NATIONAL_RETAIL_MANAGER
    ) {
      if (!user.divisionId)
        throw new ForbiddenException("User has no division assigned");
      const result = await this.db
        .select({ id: brands.id })
        .from(brands)
        .where(sql`${brands.divisionId} = ${user.divisionId}`);
      return result.map((r) => r.id);
    }

    if (!user.brandId) throw new ForbiddenException("User has no brand assigned");
    return [user.brandId];
  }

  /**
   * Asserts the user has a storeId. Returns it or throws.
   */
  assertStore(user: SessionUser): string {
    if (!user.storeId) {
      throw new ForbiddenException("This action requires a store assignment");
    }
    return user.storeId;
  }

  /**
   * Asserts the user has a brandId. Returns it or throws.
   */
  assertBrand(user: SessionUser): string {
    if (!user.brandId) {
      throw new ForbiddenException("This action requires a brand assignment");
    }
    return user.brandId;
  }

  /**
   * Asserts the user has a divisionId. Returns it or throws.
   */
  assertDivision(user: SessionUser): string {
    if (!user.divisionId) {
      throw new ForbiddenException("This action requires a division assignment");
    }
    return user.divisionId;
  }

  /**
   * Verifies that a customer belongs to a store accessible by the user.
   * Throws ForbiddenException if not.
   */
  async assertCustomerAccess(customerId: string, user: SessionUser): Promise<void> {
    if (user.role === UserRole.ADMIN) return;

    const [customer] = await this.db
      .select({ storeId: customers.signupStoreId })
      .from(customers)
      .where(eq(customers.id, customerId));

    if (!customer) return; // let the caller handle not found

    const accessibleStoreIds = await this.getAccessibleStoreIds(user);
    if (!accessibleStoreIds.includes(customer.storeId)) {
      throw new ForbiddenException("You do not have access to this customer");
    }
  }
}
