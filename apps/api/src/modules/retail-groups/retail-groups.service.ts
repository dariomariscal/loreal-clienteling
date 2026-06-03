import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, asc } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { retailGroups, stores } from "@loreal/database";

/**
 * CRUD + read helpers for the `retail_groups` hierarchy.
 *
 * The hierarchy is Salesforce CGC Account-style: retailer (top, e.g. El Puerto
 * de Liverpool) → banner (Liverpool, Palacio) → optional region. Stores carry
 * a denormalized `banner` string for fast filtering; this service is the
 * source of truth.
 */
@Injectable()
export class RetailGroupsService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async listAll() {
    return this.db.select().from(retailGroups).orderBy(asc(retailGroups.kind), asc(retailGroups.name));
  }

  async listBanners() {
    return this.db
      .select()
      .from(retailGroups)
      .where(eq(retailGroups.kind, "banner"))
      .orderBy(asc(retailGroups.name));
  }

  async listRetailers() {
    return this.db
      .select()
      .from(retailGroups)
      .where(eq(retailGroups.kind, "retailer"))
      .orderBy(asc(retailGroups.name));
  }

  async findOne(id: string) {
    const [row] = await this.db
      .select()
      .from(retailGroups)
      .where(eq(retailGroups.id, id));
    if (!row) throw new NotFoundException("Retail group not found");
    return row;
  }

  /** Stores enrolled under a given retail group leaf. */
  async storesInGroup(groupId: string) {
    return this.db
      .select({
        id: stores.id,
        code: stores.code,
        displayName: stores.displayName,
        banner: stores.banner,
        isActive: stores.isActive,
      })
      .from(stores)
      .where(eq(stores.retailGroupId, groupId))
      .orderBy(asc(stores.displayName));
  }
}
