CREATE TABLE "municipalities" (
	"id" varchar(5) PRIMARY KEY NOT NULL,
	"state_code" varchar(2) NOT NULL,
	"state_name" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"boundary" geometry(MultiPolygon, 4326) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zone_municipalities" (
	"zone_id" uuid NOT NULL,
	"municipality_id" varchar(5) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zone_municipalities_zone_id_municipality_id_pk" PRIMARY KEY("zone_id","municipality_id")
);
--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "district" varchar(100);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "municipality_id" varchar(5);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "postcode" varchar(10);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "geom" geometry(Point, 4326);--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN "color" varchar(7) DEFAULT '#D4AF37' NOT NULL;--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN "icon" varchar(50) DEFAULT 'map-pin' NOT NULL;--> statement-breakpoint
ALTER TABLE "zone_municipalities" ADD CONSTRAINT "zone_municipalities_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zone_municipalities" ADD CONSTRAINT "zone_municipalities_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "municipalities_state_idx" ON "municipalities" USING btree ("state_code");--> statement-breakpoint
CREATE INDEX "municipalities_boundary_gix" ON "municipalities" USING gist ("boundary");--> statement-breakpoint
CREATE INDEX "zone_municipalities_municipality_idx" ON "zone_municipalities" USING btree ("municipality_id");--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stores_municipality_idx" ON "stores" USING btree ("municipality_id");--> statement-breakpoint
CREATE INDEX "stores_geom_gix" ON "stores" USING gist ("geom");--> statement-breakpoint

-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-derive store.geom from lat/lng and store.municipality_id from geom,
-- and auto-assign store.zone_id from the zone_municipalities pivot.
-- A single trigger keeps these three columns in sync on INSERT and UPDATE.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION stores_set_geo_fields()
RETURNS trigger AS $$
BEGIN
  -- 1. geom from lat/lng if either changed and both present
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lng::float8, NEW.lat::float8), 4326);
  ELSE
    NEW.geom := NULL;
  END IF;

  -- 2. municipality_id from geom (point-in-polygon). Skip if caller explicitly
  --    set it on this row (e.g. manual override or already correct).
  IF NEW.geom IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.municipality_id IS NULL OR NEW.geom IS DISTINCT FROM OLD.geom) THEN
    SELECT id INTO NEW.municipality_id
    FROM municipalities
    WHERE ST_Contains(boundary, NEW.geom)
    LIMIT 1;
  END IF;

  -- 3. zone_id from the pivot, only if caller didn't pick one manually.
  IF NEW.zone_id IS NULL AND NEW.municipality_id IS NOT NULL THEN
    SELECT zone_id INTO NEW.zone_id
    FROM zone_municipalities
    WHERE municipality_id = NEW.municipality_id
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DROP TRIGGER IF EXISTS stores_set_geo_fields_trigger ON stores;--> statement-breakpoint
CREATE TRIGGER stores_set_geo_fields_trigger
BEFORE INSERT OR UPDATE OF lat, lng, municipality_id ON stores
FOR EACH ROW
EXECUTE FUNCTION stores_set_geo_fields();
--> statement-breakpoint

-- Reassign all stores when a zone↔municipality link changes.
CREATE OR REPLACE FUNCTION zone_municipalities_reassign_stores()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE stores SET zone_id = NULL
    WHERE municipality_id = OLD.municipality_id AND zone_id = OLD.zone_id;
    RETURN OLD;
  ELSE
    UPDATE stores SET zone_id = NEW.zone_id
    WHERE municipality_id = NEW.municipality_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DROP TRIGGER IF EXISTS zone_municipalities_reassign_trigger ON zone_municipalities;--> statement-breakpoint
CREATE TRIGGER zone_municipalities_reassign_trigger
AFTER INSERT OR DELETE ON zone_municipalities
FOR EACH ROW
EXECUTE FUNCTION zone_municipalities_reassign_stores();