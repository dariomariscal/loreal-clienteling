import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { zones, zoneMunicipalities } from "@loreal/database";
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
      user.role === "supervisor" && user.zoneId
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
    }

    return this.findOne(id);
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
