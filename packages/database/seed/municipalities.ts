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

/**
 * All 32 Mexican states. By default we seed the ones we currently operate in;
 * pass `STATES=01,02,09` (INEGI 2-digit codes) to override at runtime.
 */
const ALL_STATES: Array<{ code: string; name: string; file: string }> = [
  { code: "01", name: "Aguascalientes", file: "Aguascalientes.json" },
  { code: "02", name: "Baja California", file: "Baja California.json" },
  { code: "03", name: "Baja California Sur", file: "Baja California Sur.json" },
  { code: "04", name: "Campeche", file: "Campeche.json" },
  { code: "05", name: "Coahuila de Zaragoza", file: "Coahuila de Zaragoza.json" },
  { code: "06", name: "Colima", file: "Colima.json" },
  { code: "07", name: "Chiapas", file: "Chiapas.json" },
  { code: "08", name: "Chihuahua", file: "Chihuahua.json" },
  { code: "09", name: "Ciudad de México", file: "Ciudad de México.json" },
  { code: "10", name: "Durango", file: "Durango.json" },
  { code: "11", name: "Guanajuato", file: "Guanajuato.json" },
  { code: "12", name: "Guerrero", file: "Guerrero.json" },
  { code: "13", name: "Hidalgo", file: "Hidalgo.json" },
  { code: "14", name: "Jalisco", file: "Jalisco.json" },
  { code: "15", name: "México", file: "México.json" },
  { code: "16", name: "Michoacán de Ocampo", file: "Michoacán de Ocampo.json" },
  { code: "17", name: "Morelos", file: "Morelos.json" },
  { code: "18", name: "Nayarit", file: "Nayarit.json" },
  { code: "19", name: "Nuevo León", file: "Nuevo León.json" },
  { code: "20", name: "Oaxaca", file: "Oaxaca.json" },
  { code: "21", name: "Puebla", file: "Puebla.json" },
  { code: "22", name: "Querétaro", file: "Querétaro.json" },
  { code: "23", name: "Quintana Roo", file: "Quintana Roo.json" },
  { code: "24", name: "San Luis Potosí", file: "San Luis Potosí.json" },
  { code: "25", name: "Sinaloa", file: "Sinaloa.json" },
  { code: "26", name: "Sonora", file: "Sonora.json" },
  { code: "27", name: "Tabasco", file: "Tabasco.json" },
  { code: "28", name: "Tamaulipas", file: "Tamaulipas.json" },
  { code: "29", name: "Tlaxcala", file: "Tlaxcala.json" },
  { code: "30", name: "Veracruz de Ignacio de la Llave", file: "Veracruz de Ignacio de la Llave.json" },
  { code: "31", name: "Yucatán", file: "Yucatán.json" },
  { code: "32", name: "Zacatecas", file: "Zacatecas.json" },
];

const DEFAULT_CODES = ["01", "09", "15"];

const requested = (process.env.STATES ?? process.argv.slice(2).join(","))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const codesToSeed = requested.length > 0 ? requested : DEFAULT_CODES;
const STATES = ALL_STATES.filter((s) => codesToSeed.includes(s.code));

if (STATES.length === 0) {
  console.error(`No matching states for codes: ${codesToSeed.join(", ")}`);
  process.exit(1);
}

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
