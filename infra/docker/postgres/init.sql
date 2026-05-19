-- Enable PostGIS (geometry, geography, spatial indexes, point-in-polygon)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable logical replication for PowerSync
ALTER SYSTEM SET wal_level = logical;

-- Note: wal_level change requires a restart of Postgres.
-- Docker will handle this on first boot since init.sql runs before
-- the server accepts connections.

-- Create publication for PowerSync (tables that sync to mobile devices)
-- This runs after the schema is created by Drizzle migrations,
-- so we wrap it in a function that can be called after migrations.
CREATE OR REPLACE FUNCTION create_powersync_publication()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'powersync') THEN
    CREATE PUBLICATION powersync FOR TABLE
      customers,
      beauty_profiles,
      beauty_profile_shades,
      products,
      product_availability,
      recommendations,
      purchases,
      purchase_items,
      samples,
      appointments,
      message_templates,
      brands,
      brand_configs,
      stores;
  END IF;
END;
$$ LANGUAGE plpgsql;
