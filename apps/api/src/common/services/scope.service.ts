import { Injectable, Inject, ForbiddenException } from "@nestjs/common";
import { eq, inArray, sql, type SQL, type Column } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { stores, customers, brandStores } from "@loreal/database";
import type { SessionUser } from "../types/session";

@Injectable()
export class ScopeService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  /**
   * Returns a Drizzle WHERE condition that filters rows by the user's accessible stores.
   * Pass the storeId column of the table you're querying.
   */
  async scopeByStore(
    user: SessionUser,
    storeIdColumn: Column,
  ): Promise<SQL | undefined> {
    if (user.role === "admin") return undefined; // no filter
    if (user.role === "supervisor") {
      const storeIds = await this.getAccessibleStoreIds(user);
      if (storeIds.length === 0) return sql`false`;
      return inArray(storeIdColumn, storeIds);
    }
    // BA and manager: single store
    if (!user.storeId) throw new ForbiddenException("User has no store assigned");
    return eq(storeIdColumn, user.storeId);
  }



  /**
   * Returns a Drizzle WHERE condition that filters rows by the user's brand.
   */
  scopeByBrand(user: SessionUser, brandIdColumn: Column): SQL | undefined {
    if (user.role === "admin") return undefined;
    if (!user.brandId) throw new ForbiddenException("User has no brand assigned");
    return eq(brandIdColumn, user.brandId);
  }

  /**
   * Returns the list of store UUIDs accessible to the user.
   * Admin returns null (meaning all stores).
   */
  async getAccessibleStoreIds(user: SessionUser): Promise<string[]> {
    if (user.role === "admin") return [];
    if (user.role === "supervisor") {
      if (!user.zoneId) throw new ForbiddenException("Supervisor has no zone assigned");
      if (!user.brandId) throw new ForbiddenException("Supervisor has no brand assigned");
      const result = await this.db
        .select({ id: stores.id })
        .from(stores)
        .innerJoin(brandStores, eq(brandStores.storeId, stores.id))
        .where(
          sql`${stores.zoneId} = ${user.zoneId} AND ${brandStores.brandId} = ${user.brandId}`,
        );
      return result.map((r) => r.id);
    }
    if (!user.storeId) throw new ForbiddenException("User has no store assigned");
    return [user.storeId];
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
   * Verifies that a customer belongs to a store accessible by the user.
   * Throws ForbiddenException if not.
   */
  async assertCustomerAccess(customerId: string, user: SessionUser): Promise<void> {
    if (user.role === "admin") return;

    const [customer] = await this.db
      .select({ storeId: customers.registeredAtStoreId })
      .from(customers)
      .where(eq(customers.id, customerId));

    if (!customer) return; // let the caller handle not found

    const accessibleStoreIds = await this.getAccessibleStoreIds(user);
    if (!accessibleStoreIds.includes(customer.storeId)) {
      throw new ForbiddenException("You do not have access to this customer");
    }
  }
}
