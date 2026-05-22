import { customType } from "drizzle-orm/pg-core";

/**
 * PostGIS geometry(Point, 4326).
 * Stored as EWKT/WKB; we exchange GeoJSON-like { lat, lng } at the app layer
 * via SQL helpers (ST_MakePoint / ST_AsGeoJSON). This custom type lets Drizzle
 * declare the column with the right SQL type and spatial index syntax.
 */
export const point = customType<{
  data: { lat: number; lng: number };
  driverData: string;
}>({
  dataType() {
    return "geometry(Point, 4326)";
  },
  toDriver(value) {
    return `SRID=4326;POINT(${value.lng} ${value.lat})`;
  },
});

/**
 * PostGIS geometry(MultiPolygon, 4326) — used for municipality / zone boundaries.
 * Driver data is GeoJSON string; conversion to/from PostGIS done via SQL
 * (ST_GeomFromGeoJSON / ST_AsGeoJSON) at query time.
 */
export const multiPolygon = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return "geometry(MultiPolygon, 4326)";
  },
});

/**
 * pgvector column. Stores high-dimensional embeddings produced by an embedding
 * model (e.g. OpenAI text-embedding-3-small → 1536 dims). The extension itself
 * must be enabled at the database level: `CREATE EXTENSION IF NOT EXISTS vector`.
 *
 * Driver representation is the string form `[0.123,0.456,...]` that pgvector
 * accepts on the wire; the app layer always works with `number[]`.
 */
export const vector = customType<{
  data: number[];
  driverData: string;
  config: { dimensions: number };
  configRequired: true;
}>({
  dataType(config) {
    return `vector(${config.dimensions})`;
  },
  toDriver(value) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value) {
    if (typeof value === "string") {
      return JSON.parse(value) as number[];
    }
    return value as number[];
  },
});
