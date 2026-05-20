/**
 * Seeds the `stores` table from a static list. Idempotent: re-running upserts
 * by `code`. Geocoding falls back to OpenStreetMap Nominatim when an entry
 * doesn't ship explicit lat/lng (free, no API key, ~1 req/s rate limit).
 *
 * Run: pnpm --filter @loreal/database seed:stores
 *
 * Adding a sucursal: append to the `SEED_STORES` array below. Once the seed
 * resolves lat/lng successfully, paste the returned values back into the entry
 * so reruns skip the network call.
 */
import "dotenv/config";
import { Pool } from "pg";
import type { StoreHours } from "../schema/stores";

interface SeedStore {
  code: string;
  displayName: string;
  chain: "liverpool" | "palacio" | "owned";
  address: string;
  city?: string;
  state?: string;
  district?: string;
  postcode?: string;
  phone?: string;
  hours?: StoreHours;
  /**
   * Override the string sent to Nominatim. Use when the official postal
   * address is too granular and Nominatim returns no match — typically a
   * shorter "<Place name>, <city>" query works better.
   */
  geocodeQuery?: string;
  /** Skip geocoding when set. */
  lat?: number;
  lng?: number;
  /** Skip ST_Contains lookup when set. */
  municipalityId?: string;
  /** Resolved against `brands.code` and written to `brand_stores`. */
  brandCodes?: string[];
}

const SEED_STORES: SeedStore[] = [
  {
    code: "LIV-AGS-ALTARIA",
    displayName: "Liverpool Ags. Altaria",
    chain: "liverpool",
    address:
      "Blvd. a Zacatecas 851, Centro Comercial Altaria, Trojes de Alonso, 20116 Aguascalientes, Ags.",
    geocodeQuery: "Centro Comercial Altaria, Aguascalientes",
    city: "Aguascalientes",
    state: "Aguascalientes",
    district: "Trojes de Alonso",
    postcode: "20116",
    phone: "4491393400",
    hours: {
      store: { "mon-sun": "11:00-21:00" },
      clickCollect: { "mon-sun": "11:00-21:00" },
      access: "Entrada por Playa y viaje",
    },
    brandCodes: ["LANCOME", "YSL"],
  },
];

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_USER_AGENT =
  "loreal-clienteling-seed (https://github.com/loreal/clienteling)";

async function geocode(address: string): Promise<{ lat: number; lng: number }> {
  const url = `${NOMINATIM_URL}?format=json&limit=1&countrycodes=mx&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": NOMINATIM_USER_AGENT, "Accept-Language": "es" },
  });
  if (!res.ok) {
    throw new Error(`Nominatim ${res.status} ${res.statusText} for "${address}"`);
  }
  const rows = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (rows.length === 0) {
    throw new Error(`Nominatim returned no result for "${address}"`);
  }
  return { lat: Number(rows[0].lat), lng: Number(rows[0].lon) };
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function seed() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgresql://loreal:loreal@localhost:5433/loreal_clienteling",
  });

  let inserted = 0;
  let updated = 0;
  let geocoded = 0;

  try {
    console.log(`🏬 Seeding ${SEED_STORES.length} store(s)...\n`);

    for (const s of SEED_STORES) {
      console.log(`→ ${s.code} (${s.displayName})`);

      let lat = s.lat;
      let lng = s.lng;
      if (lat === undefined || lng === undefined) {
        const query = s.geocodeQuery ?? s.address;
        console.log(`   geocoding: ${query}`);
        const point = await geocode(query);
        lat = point.lat;
        lng = point.lng;
        geocoded++;
        console.log(`   → lat=${lat}, lng=${lng}`);
        await sleep(1100); // be nice to Nominatim
      }

      let municipalityId = s.municipalityId;
      if (!municipalityId) {
        const { rows } = await pool.query<{ id: string }>(
          `SELECT id FROM municipalities
           WHERE ST_Contains(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326))
           LIMIT 1`,
          [lng, lat],
        );
        municipalityId = rows[0]?.id;
        if (!municipalityId) {
          console.warn(
            `   ⚠ no municipality polygon contains (${lat}, ${lng}). Have you seeded that state?`,
          );
        } else {
          console.log(`   municipalityId: ${municipalityId}`);
        }
      }

      let zoneId: string | null = null;
      if (municipalityId) {
        const { rows } = await pool.query<{ zone_id: string }>(
          `SELECT zone_id FROM zone_municipalities WHERE municipality_id = $1 LIMIT 1`,
          [municipalityId],
        );
        zoneId = rows[0]?.zone_id ?? null;
      }

      const upsert = await pool.query<{ id: string; inserted: boolean }>(
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
          s.code,
          s.displayName,
          s.chain,
          s.address,
          s.city ?? null,
          s.state ?? null,
          s.district ?? null,
          s.postcode ?? null,
          municipalityId ?? null,
          zoneId,
          lat,
          lng,
          s.phone ?? null,
          s.hours ? JSON.stringify(s.hours) : null,
        ],
      );

      const row = upsert.rows[0];
      if (row.inserted) inserted++;
      else updated++;

      if (s.brandCodes && s.brandCodes.length > 0) {
        const { rows: brandRows } = await pool.query<{ id: string; code: string }>(
          `SELECT id, code FROM brands WHERE code = ANY($1::text[])`,
          [s.brandCodes],
        );
        const missing = s.brandCodes.filter(
          (c) => !brandRows.some((b) => b.code === c),
        );
        if (missing.length > 0) {
          console.warn(`   ⚠ brand codes not found: ${missing.join(", ")}`);
        }
        await pool.query(`DELETE FROM brand_stores WHERE store_id = $1`, [row.id]);
        for (const b of brandRows) {
          await pool.query(
            `INSERT INTO brand_stores (brand_id, store_id) VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [b.id, row.id],
          );
        }
        console.log(`   brands: ${brandRows.map((b) => b.code).join(", ") || "—"}`);
      }
    }

    console.log(
      `\n✅ Done. inserted=${inserted}, updated=${updated}, geocoded=${geocoded}`,
    );
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
