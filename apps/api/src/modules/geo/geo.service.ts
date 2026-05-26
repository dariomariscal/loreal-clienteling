import { Injectable, Inject } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DATABASE_TOKEN, type Database } from "../../config/database.provider";
import { municipalities } from "@loreal/database";
import { UserRole } from "@loreal/contracts";
import type { SessionUser } from "../../common/types/session";
import { ScopeService } from "../../common/services/scope.service";

@Injectable()
export class GeoService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(ScopeService) private scopeService: ScopeService,
  ) {}

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

  /**
   * Customer density per municipality, scoped to the user's accessible stores.
   * Returns either a flat list (for tables/cards) or a GeoJSON
   * FeatureCollection where each feature carries a `customerCount` property
   * (for choropleth heatmaps). Customers are bucketed by the municipality of
   * the store where they signed up.
   */
  async customerDensity(
    user: SessionUser,
    opts: { geojson?: boolean; simplifyTolerance?: number } = {},
  ) {
    const accessibleStoreIds = await this.scopeService.getAccessibleStoreIds(user);
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isAdmin && accessibleStoreIds.length === 0) {
      if (opts.geojson) return { type: "FeatureCollection", features: [] };
      return { data: [] };
    }

    const storeFilter = isAdmin
      ? sql``
      : sql`AND s.id IN (${sql.join(accessibleStoreIds.map((id) => sql`${id}`), sql`, `)})`;

    if (!opts.geojson) {
      const result = await this.db.execute(sql`
        SELECT m.id AS municipality_id,
               m.name AS municipality_name,
               m.state_code AS state_code,
               m.state_name AS state_name,
               COUNT(c.id)::int AS customer_count
        FROM municipalities m
        LEFT JOIN stores s ON s.municipality_id = m.id ${storeFilter}
        LEFT JOIN customers c ON c.signup_store_id = s.id
        GROUP BY m.id, m.name, m.state_code, m.state_name
        HAVING COUNT(c.id) > 0
        ORDER BY customer_count DESC
      `);

      const rows = (result as unknown as { rows: Array<Record<string, unknown>> }).rows;
      return {
        data: rows.map((r) => ({
          municipalityId: r.municipality_id,
          municipalityName: r.municipality_name,
          stateCode: r.state_code,
          stateName: r.state_name,
          customerCount: Number(r.customer_count ?? 0),
        })),
      };
    }

    const geomExpr = opts.simplifyTolerance
      ? sql`ST_AsGeoJSON(ST_SimplifyPreserveTopology(m.boundary, ${opts.simplifyTolerance}))::jsonb`
      : sql`ST_AsGeoJSON(m.boundary)::jsonb`;

    const result = await this.db.execute(sql`
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'id', m.id,
            'geometry', ${geomExpr},
            'properties', jsonb_build_object(
              'id', m.id,
              'name', m.name,
              'stateCode', m.state_code,
              'stateName', m.state_name,
              'customerCount', COALESCE(cust_counts.cnt, 0)
            )
          )
        ), '[]'::jsonb)
      ) AS feature_collection
      FROM municipalities m
      LEFT JOIN (
        SELECT s.municipality_id, COUNT(c.id) AS cnt
        FROM stores s
        INNER JOIN customers c ON c.signup_store_id = s.id
        WHERE s.municipality_id IS NOT NULL ${storeFilter}
        GROUP BY s.municipality_id
      ) cust_counts ON cust_counts.municipality_id = m.id
      WHERE COALESCE(cust_counts.cnt, 0) > 0
    `);

    const row = (result as unknown as { rows: { feature_collection: unknown }[] }).rows[0];
    return row?.feature_collection ?? { type: "FeatureCollection", features: [] };
  }
}
