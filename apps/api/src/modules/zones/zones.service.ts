import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { and, eq, isNull, notInArray, or, sql } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { stores, zones, zoneMunicipalities } from "@loreal/database";
import type { SessionUser } from "../../common/types/session";

type CreateZoneInput = {
  code: string;
  displayName: string;
  color?: string;
  icon?: string;
  municipalityIds?: string[];
};

type UpdateZoneInput = Partial<CreateZoneInput>;

@Injectable()
export class ZonesService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async findAll(user: SessionUser) {
    const rows =
      user.role === "area_manager" && user.zoneId
        ? await this.db.select().from(zones).where(eq(zones.id, user.zoneId))
        : await this.db.select().from(zones);

    return Promise.all(rows.map((z) => this.attachMunicipalities(z)));
  }

  async findOne(id: string) {
    const [zone] = await this.db.select().from(zones).where(eq(zones.id, id));
    if (!zone) throw new NotFoundException("Zone not found");
    return this.attachMunicipalities(zone);
  }

  async create(data: CreateZoneInput) {
    const { municipalityIds, ...rest } = data;
    const [zone] = await this.db.insert(zones).values(rest).returning();

    if (municipalityIds && municipalityIds.length > 0) {
      await this.db
        .insert(zoneMunicipalities)
        .values(municipalityIds.map((municipalityId) => ({ zoneId: zone.id, municipalityId })));
    }

    await this.syncStoresForZone(zone.id);

    return this.findOne(zone.id);
  }

  async update(id: string, data: UpdateZoneInput) {
    const { municipalityIds, ...rest } = data;
    const [zone] = await this.db
      .update(zones)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(zones.id, id))
      .returning();
    if (!zone) throw new NotFoundException("Zone not found");

    if (municipalityIds !== undefined) {
      await this.db.delete(zoneMunicipalities).where(eq(zoneMunicipalities.zoneId, id));
      if (municipalityIds.length > 0) {
        await this.db
          .insert(zoneMunicipalities)
          .values(municipalityIds.map((municipalityId) => ({ zoneId: id, municipalityId })));
      }
      await this.syncStoresForZone(id);
    }

    return this.findOne(id);
  }

  /**
   * Brings stores.zone_id in sync with zone_municipalities for one zone.
   * Called after the membership of a zone changes:
   *   - Pulls in stores whose municipality is now in the zone but had no
   *     zone_id (or pointed elsewhere with a stale link).
   *   - Releases stores that used to point here but whose municipality was
   *     dropped from the zone — they fall back to NULL so they can be
   *     re-attracted by another zone if applicable.
   */
  private async syncStoresForZone(zoneId: string): Promise<void> {
    const members = await this.db
      .select({ municipalityId: zoneMunicipalities.municipalityId })
      .from(zoneMunicipalities)
      .where(eq(zoneMunicipalities.zoneId, zoneId));
    const memberIds = members.map((m) => m.municipalityId);

    if (memberIds.length > 0) {
      await this.db
        .update(stores)
        .set({ zoneId, updatedAt: new Date() })
        .where(
          and(
            sql`${stores.municipalityId} IN (${sql.join(
              memberIds.map((id) => sql`${id}`),
              sql`, `,
            )})`,
            or(isNull(stores.zoneId), sql`${stores.zoneId} <> ${zoneId}`),
          ),
        );
    }

    // Release stores that were pointing here but no longer belong.
    await this.db
      .update(stores)
      .set({ zoneId: null, updatedAt: new Date() })
      .where(
        and(
          eq(stores.zoneId, zoneId),
          memberIds.length > 0
            ? notInArray(stores.municipalityId, memberIds)
            : sql`true`,
        ),
      );
  }

  /** Lookup zone that contains the given point. Used by store create/edit flow. */
  async findByPoint(lat: number, lng: number) {
    const result = await this.db.execute(sql`
      SELECT z.*
      FROM zones z
      JOIN zone_municipalities zm ON zm.zone_id = z.id
      JOIN municipalities m ON m.id = zm.municipality_id
      WHERE ST_Contains(m.boundary, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
      LIMIT 1
    `);
    const row = (result as unknown as { rows: Record<string, unknown>[] }).rows[0];
    return row ?? null;
  }

  private async attachMunicipalities(zone: typeof zones.$inferSelect) {
    const links = await this.db
      .select({ municipalityId: zoneMunicipalities.municipalityId })
      .from(zoneMunicipalities)
      .where(eq(zoneMunicipalities.zoneId, zone.id));
    return { ...zone, municipalityIds: links.map((l) => l.municipalityId) };
  }
}
