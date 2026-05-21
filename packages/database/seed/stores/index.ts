/**
 * Seeds the `stores` table from per-state datasets. Idempotent: re-running
 * upserts by `code`. Geocoding falls back to OpenStreetMap Nominatim when
 * an entry doesn't ship explicit lat/lng (free, no API key, ~1 req/s rate
 * limit).
 *
 * Run: pnpm --filter @loreal/database seed:stores
 *
 * Adding a sucursal: append to the matching `data/<state>.ts` file. Once
 * the seed resolves lat/lng successfully, you may paste the returned values
 * back into the entry so reruns skip the network call.
 */
import "dotenv/config";
import { Pool } from "pg";
import { SEED_STORES } from "./data";
import { geocode, sleep } from "./geocoder";
import {
  replaceBrandStores,
  resolveMunicipalityId,
  resolveZoneId,
  upsertStore,
} from "./repository";

async function main() {
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
        municipalityId = await resolveMunicipalityId(pool, lat, lng);
        if (!municipalityId) {
          console.warn(
            `   ⚠ no municipality polygon contains (${lat}, ${lng}). Have you seeded that state?`,
          );
        } else {
          console.log(`   municipalityId: ${municipalityId}`);
        }
      }

      const zoneId = municipalityId
        ? await resolveZoneId(pool, municipalityId)
        : null;

      const row = await upsertStore(
        pool,
        s,
        lat,
        lng,
        municipalityId ?? null,
        zoneId,
      );
      if (row.inserted) inserted++;
      else updated++;

      if (s.brandCodes && s.brandCodes.length > 0) {
        const { linked, missing } = await replaceBrandStores(
          pool,
          row.id,
          s.brandCodes,
        );
        if (missing.length > 0) {
          console.warn(`   ⚠ brand codes not found: ${missing.join(", ")}`);
        }
        console.log(`   brands: ${linked.join(", ") || "—"}`);
      }
    }

    console.log(
      `\n✅ Done. inserted=${inserted}, updated=${updated}, geocoded=${geocoded}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
