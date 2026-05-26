-- Adds L'Oréal divisions and migrates user roles to the official L'Oréal Luxe
-- nomenclature. See rfp-loreal-clienteling/10-roles-operativos.md for the
-- canonical role definitions.
--
-- All statements are idempotent so re-running this migration (or running it
-- against an environment where it was applied manually) is safe.

-- 1. Divisions table
CREATE TABLE IF NOT EXISTS "divisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" varchar(30) NOT NULL UNIQUE,
  "display_name" varchar(200) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Canonical division UUIDs. These match the values in
-- packages/database/seed/divisions.ts (DIVISION_SEED). They are pinned so
-- Clerk publicMetadata.divisionId references the same id across every
-- environment (local docker, Neon dev, Neon prod, staging).
INSERT INTO "divisions" ("id", "code", "display_name") VALUES
  ('c74d7620-94e0-421f-9bf8-2e4d1221805e'::uuid, 'luxe',         'L''Oréal Luxe'),
  ('360a3e11-5608-4a65-8ba1-05aa1e6b544f'::uuid, 'consumer',     'Consumer Products'),
  ('2da13042-f8cb-46a2-99c1-46b4d298deda'::uuid, 'active',       'Active Cosmetics'),
  ('b1166840-d11b-49be-a10d-5814e7169663'::uuid, 'professional', 'Professional Products')
ON CONFLICT ("code") DO NOTHING;

-- 2. brands.division_id (FK)
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "division_id" uuid;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'brands_division_id_divisions_id_fk'
  ) THEN
    ALTER TABLE "brands"
      ADD CONSTRAINT "brands_division_id_divisions_id_fk"
      FOREIGN KEY ("division_id") REFERENCES "divisions"("id");
  END IF;
END $$;

-- Default-assign existing Luxe brands (Lancôme + YSL seed).
UPDATE "brands"
SET "division_id" = (SELECT "id" FROM "divisions" WHERE "code" = 'luxe')
WHERE "code" IN ('LANCOME', 'YSL') AND "division_id" IS NULL;

-- 3. users.division_id + users.specialty
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "division_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "specialty" text;

-- 4. Rename role values to the official L'Oréal Luxe vocabulary.
UPDATE "users" SET "role" = 'beauty_advisor'  WHERE "role" = 'ba';
UPDATE "users" SET "role" = 'counter_manager' WHERE "role" = 'manager';
UPDATE "users" SET "role" = 'area_manager'    WHERE "role" = 'supervisor';

-- 5. Multibrand Area Manager: drop brandId, derive divisionId from former brand.
--    A supervisor scoped to a single brand is the L'Oréal exception; the
--    default operating model is multi-brand inside a division.
UPDATE "users"
SET "division_id" = b."division_id"::text,
    "brand_id" = NULL
FROM "brands" b
WHERE "users"."role" = 'area_manager'
  AND "users"."brand_id" IS NOT NULL
  AND b."id"::text = "users"."brand_id";

-- 6. Default specialty for BAs that still lack one.
UPDATE "users" SET "specialty" = 'generalist'
WHERE "role" = 'beauty_advisor' AND "specialty" IS NULL;

-- 7. New default for the column going forward.
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'beauty_advisor';
