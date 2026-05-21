import type { Pool } from "pg";
import type { SeedStore } from "./types";

export async function resolveMunicipalityId(
  pool: Pool,
  lat: number,
  lng: number,
): Promise<string | undefined> {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM municipalities
     WHERE ST_Contains(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326))
     LIMIT 1`,
    [lng, lat],
  );
  return rows[0]?.id;
}

export async function resolveZoneId(
  pool: Pool,
  municipalityId: string,
): Promise<string | null> {
  const { rows } = await pool.query<{ zone_id: string }>(
    `SELECT zone_id FROM zone_municipalities WHERE municipality_id = $1 LIMIT 1`,
    [municipalityId],
  );
  return rows[0]?.zone_id ?? null;
}

export interface UpsertedStore {
  id: string;
  inserted: boolean;
}

export async function upsertStore(
  pool: Pool,
  store: SeedStore,
  lat: number,
  lng: number,
  municipalityId: string | null,
  zoneId: string | null,
): Promise<UpsertedStore> {
  const { rows } = await pool.query<UpsertedStore>(
    `INSERT INTO stores (
       code, display_name, chain, address, city, state, district, postcode,
       municipality_id, zone_id, lat, lng,
       geom, phone, hours, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8,
       $9, $10, $11::numeric, $12::numeric,
       ST_SetSRID(ST_MakePoint($12::double precision, $11::double precision), 4326),
       $13, $14::jsonb, now()
     )
     ON CONFLICT (code) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       chain = EXCLUDED.chain,
       address = EXCLUDED.address,
       city = EXCLUDED.city,
       state = EXCLUDED.state,
       district = EXCLUDED.district,
       postcode = EXCLUDED.postcode,
       municipality_id = EXCLUDED.municipality_id,
       zone_id = COALESCE(EXCLUDED.zone_id, stores.zone_id),
       lat = EXCLUDED.lat,
       lng = EXCLUDED.lng,
       geom = EXCLUDED.geom,
       phone = EXCLUDED.phone,
       hours = EXCLUDED.hours,
       updated_at = now()
     RETURNING id, (xmax = 0) AS inserted`,
    [
      store.code,
      store.displayName,
      store.chain,
      store.address,
      store.city ?? null,
      store.state ?? null,
      store.district ?? null,
      store.postcode ?? null,
      municipalityId,
      zoneId,
      lat,
      lng,
      store.phone ?? null,
      store.hours ? JSON.stringify(store.hours) : null,
    ],
  );
  return rows[0];
}

export async function replaceBrandStores(
  pool: Pool,
  storeId: string,
  brandCodes: string[],
): Promise<{ linked: string[]; missing: string[] }> {
  const { rows: brandRows } = await pool.query<{ id: string; code: string }>(
    `SELECT id, code FROM brands WHERE code = ANY($1::text[])`,
    [brandCodes],
  );
  const missing = brandCodes.filter(
    (c) => !brandRows.some((b) => b.code === c),
  );
  await pool.query(`DELETE FROM brand_stores WHERE store_id = $1`, [storeId]);
  for (const b of brandRows) {
    await pool.query(
      `INSERT INTO brand_stores (brand_id, store_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [b.id, storeId],
    );
  }
  return { linked: brandRows.map((b) => b.code), missing };
}
