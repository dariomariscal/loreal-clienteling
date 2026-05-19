/**
 * Seeds the `municipalities` table with CDMX (state 09) + Estado de México (state 15).
 *
 * Source: INEGI Marco Geoestadístico, mirrored as GeoJSON in the public domain at
 * https://github.com/PhantomInsights/mexico-geojson (Marco Geoestadístico Nacional).
 *
 * Properties expected per feature:
 *   - CVE_ENT  (2-digit state code)
 *   - CVE_MUN  (3-digit municipality code)
 *   - NOMGEO   (municipality name)
 *
 * Run: pnpm --filter @loreal/database tsx seed/municipalities.ts
 */
import "dotenv/config";
import { Pool } from "pg";

const BASE_URL = "https://raw.githubusercontent.com/PhantomInsights/mexico-geojson/main/2022/states";

const STATES: Array<{ code: string; name: string; file: string }> = [
  { code: "09", name: "Ciudad de México", file: "Ciudad de México.json" },
  { code: "15", name: "México", file: "México.json" },
];

interface InegiFeature {
  type: "Feature";
  properties: { CVE_ENT?: string; CVE_MUN?: string; NOMGEO?: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown };
}

interface InegiCollection {
  type: "FeatureCollection";
  features: InegiFeature[];
}

async function fetchState(file: string): Promise<InegiCollection> {
  const url = `${BASE_URL}/${encodeURIComponent(file)}`;
  console.log(`  ↓ Fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as InegiCollection;
}

function ensureMultiPolygon(geom: InegiFeature["geometry"]) {
  if (geom.type === "MultiPolygon") return geom;
  return { type: "MultiPolygon" as const, coordinates: [geom.coordinates] };
}

async function seed() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgresql://loreal:loreal@localhost:5433/loreal_clienteling",
  });

  try {
    console.log("🗺️  Seeding municipalities (CDMX + Estado de México)...\n");

    let inserted = 0;
    let skipped = 0;

    for (const state of STATES) {
      const collection = await fetchState(state.file);
      console.log(`  → State ${state.code} (${state.name}): ${collection.features.length} features`);

      for (const f of collection.features) {
        const cveEnt = f.properties.CVE_ENT;
        const cveMun = f.properties.CVE_MUN;
        const name = f.properties.NOMGEO;

        if (!cveEnt || !cveMun || !name) {
          skipped++;
          continue;
        }

        const id = `${cveEnt}${cveMun}`;
        const geom = ensureMultiPolygon(f.geometry);

        await pool.query(
          `INSERT INTO municipalities (id, state_code, state_name, name, boundary)
           VALUES ($1, $2, $3, $4, ST_Multi(ST_GeomFromGeoJSON($5)))
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             state_name = EXCLUDED.state_name,
             boundary = EXCLUDED.boundary`,
          [id, cveEnt, state.name, name, JSON.stringify(geom)],
        );
        inserted++;
      }
    }

    console.log(`\n✅ Inserted/updated ${inserted} municipalities (skipped ${skipped})`);

    const { rows } = await pool.query("SELECT state_code, COUNT(*) FROM municipalities GROUP BY state_code ORDER BY state_code");
    console.table(rows);
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
