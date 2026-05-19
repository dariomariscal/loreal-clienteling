import { Injectable, Inject } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { municipalities } from "@loreal/database";

@Injectable()
export class GeoService {
  constructor(@Inject(DATABASE_TOKEN) private db: Database) {}

  async listMunicipalities(stateCode?: string) {
    if (stateCode) {
      return this.db
        .select({
          id: municipalities.id,
          stateCode: municipalities.stateCode,
          stateName: municipalities.stateName,
          name: municipalities.name,
        })
        .from(municipalities)
        .where(sql`${municipalities.stateCode} = ${stateCode}`);
    }
    return this.db
      .select({
        id: municipalities.id,
        stateCode: municipalities.stateCode,
        stateName: municipalities.stateName,
        name: municipalities.name,
      })
      .from(municipalities);
  }

  /**
   * Returns municipalities as a GeoJSON FeatureCollection.
   * `simplifyTolerance` (degrees) drops vertices for lighter responses at low zoom.
   * 0.001 ≈ ~100m of detail, suitable for nationwide overview.
   */
  async municipalitiesGeoJson(opts: {
    stateCode?: string;
    simplifyTolerance?: number;
  }) {
    const { stateCode, simplifyTolerance } = opts;

    const geomExpr = simplifyTolerance
      ? sql`ST_AsGeoJSON(ST_SimplifyPreserveTopology(boundary, ${simplifyTolerance}))::jsonb`
      : sql`ST_AsGeoJSON(boundary)::jsonb`;

    const whereClause = stateCode ? sql`WHERE state_code = ${stateCode}` : sql``;

    const result = await this.db.execute(sql`
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'id', id,
            'geometry', ${geomExpr},
            'properties', jsonb_build_object(
              'id', id,
              'name', name,
              'stateCode', state_code,
              'stateName', state_name
            )
          )
        ), '[]'::jsonb)
      ) AS feature_collection
      FROM municipalities
      ${whereClause}
    `);

    const row = (result as unknown as { rows: { feature_collection: unknown }[] }).rows[0];
    return row?.feature_collection ?? { type: "FeatureCollection", features: [] };
  }
}
