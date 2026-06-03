-- ============================================================================
-- Clienteling reports migration (Tulip / Salesforce CGC patterns)
--
-- 1. customers : denormalized clienteling columns for the export
-- 2. retail_groups : Salesforce CGC Account hierarchy for "franquicia"
-- 3. sales_targets : polymorphic Goal+GoalMetric pattern
--
-- Strategy: additive. Legacy columns (target_amount, period, period_date) are
-- kept nullable until a follow-up migration drops them.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. retail_groups (new table)
-- ----------------------------------------------------------------------------
CREATE TABLE "retail_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"kind" varchar(20) NOT NULL,
	"parent_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retail_groups_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "retail_groups" ADD CONSTRAINT "retail_groups_parent_id_retail_groups_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."retail_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "retail_groups_parent_idx" ON "retail_groups" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "retail_groups_kind_idx" ON "retail_groups" USING btree ("kind");--> statement-breakpoint

-- ----------------------------------------------------------------------------
-- 2. stores : add retail_group_id (nullable, will be backfilled below)
-- ----------------------------------------------------------------------------
ALTER TABLE "stores" ADD COLUMN "retail_group_id" uuid;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_retail_group_id_retail_groups_id_fk" FOREIGN KEY ("retail_group_id") REFERENCES "public"."retail_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- ----------------------------------------------------------------------------
-- 3. customers : denormalized clienteling columns
-- ----------------------------------------------------------------------------
ALTER TABLE "customers" ADD COLUMN "last_ba_user_id" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "last_visit_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "last_follow_up_type" varchar(32);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "last_follow_up_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "next_follow_up_type" varchar(32);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "next_follow_up_due_date" date;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "open_follow_up_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "overdue_follow_up_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_last_ba_user_id_users_id_fk" FOREIGN KEY ("last_ba_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_last_ba_idx" ON "customers" USING btree ("last_ba_user_id");--> statement-breakpoint
CREATE INDEX "customers_next_followup_due_idx" ON "customers" USING btree ("next_follow_up_due_date");--> statement-breakpoint

-- ----------------------------------------------------------------------------
-- 4. sales_targets : polymorphic Goal pattern
-- ----------------------------------------------------------------------------
-- 4a. Drop old indexes that reference columns we're about to relax
DROP INDEX "sales_targets_counter_period_idx";--> statement-breakpoint
DROP INDEX "sales_targets_store_idx";--> statement-breakpoint

-- 4b. Relax NOT NULL on legacy columns so polymorphic rows can omit them
ALTER TABLE "sales_targets" ALTER COLUMN "store_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_targets" ALTER COLUMN "brand_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_targets" ALTER COLUMN "period" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_targets" ALTER COLUMN "period_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_targets" ALTER COLUMN "target_amount" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_targets" ALTER COLUMN "currency" DROP NOT NULL;--> statement-breakpoint

-- 4c. Add new columns (nullable / with defaults so existing 3 rows survive)
ALTER TABLE "sales_targets" ADD COLUMN "owner_type" varchar(20) DEFAULT 'counter' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_targets" ADD COLUMN "owner_user_id" text;--> statement-breakpoint
ALTER TABLE "sales_targets" ADD COLUMN "metric_kind" varchar(30) DEFAULT 'sales_amount' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_targets" ADD COLUMN "period_kind" varchar(10) DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_targets" ADD COLUMN "period_start" date;--> statement-breakpoint
ALTER TABLE "sales_targets" ADD COLUMN "period_end" date;--> statement-breakpoint
ALTER TABLE "sales_targets" ADD COLUMN "target_value" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "sales_targets" ADD COLUMN "parent_target_id" uuid;--> statement-breakpoint
ALTER TABLE "sales_targets" ADD CONSTRAINT "sales_targets_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- 4d. Backfill the 3 existing rows from legacy columns into the new ones
UPDATE "sales_targets"
SET
  "owner_type"  = 'counter',
  "metric_kind" = 'sales_amount',
  "period_kind" = COALESCE("period", 'monthly'),
  "period_start" = "period_date",
  "period_end"   = CASE
    WHEN "period" = 'daily'   THEN "period_date"
    WHEN "period" = 'monthly' THEN (date_trunc('month', "period_date") + interval '1 month - 1 day')::date
    ELSE "period_date"
  END,
  "target_value" = "target_amount";
--> statement-breakpoint

-- 4e. Now enforce NOT NULL on the new columns (safe — backfill is done)
ALTER TABLE "sales_targets" ALTER COLUMN "period_start" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_targets" ALTER COLUMN "period_end" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_targets" ALTER COLUMN "target_value" SET NOT NULL;--> statement-breakpoint

-- 4f. New indexes
CREATE INDEX "targets_owner_idx" ON "sales_targets" USING btree ("owner_type","store_id","brand_id","owner_user_id");--> statement-breakpoint
CREATE INDEX "targets_period_idx" ON "sales_targets" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "targets_metric_kind_idx" ON "sales_targets" USING btree ("metric_kind");--> statement-breakpoint
CREATE INDEX "targets_parent_idx" ON "sales_targets" USING btree ("parent_target_id");--> statement-breakpoint

-- ============================================================================
-- 5. DATA BACKFILL — populates demo-friendly state
-- ============================================================================

-- 5a. Seed retail_groups for Liverpool (the only banner currently in stores)
INSERT INTO "retail_groups" ("code", "name", "kind", "parent_id") VALUES
  ('liverpool-holding', 'El Puerto de Liverpool', 'retailer', NULL);
--> statement-breakpoint
INSERT INTO "retail_groups" ("code", "name", "kind", "parent_id") VALUES
  ('liverpool', 'Liverpool', 'banner',
    (SELECT "id" FROM "retail_groups" WHERE "code" = 'liverpool-holding'));
--> statement-breakpoint
INSERT INTO "retail_groups" ("code", "name", "kind", "parent_id") VALUES
  ('palacio-holding', 'Grupo Palacio de Hierro', 'retailer', NULL);
--> statement-breakpoint
INSERT INTO "retail_groups" ("code", "name", "kind", "parent_id") VALUES
  ('palacio', 'Palacio de Hierro', 'banner',
    (SELECT "id" FROM "retail_groups" WHERE "code" = 'palacio-holding'));
--> statement-breakpoint
INSERT INTO "retail_groups" ("code", "name", "kind", "parent_id") VALUES
  ('owned', 'L''Oréal Owned', 'banner', NULL);
--> statement-breakpoint

-- 5b. Link every store to its banner via retail_group_id
UPDATE "stores" SET "retail_group_id" = (
  SELECT "id" FROM "retail_groups" WHERE "code" = "stores"."banner"
)
WHERE "retail_group_id" IS NULL;
--> statement-breakpoint

-- 5c. Backfill customers.lastBaUserId + lastVisitAt from customer_visits
--     Picks the most recent visit per customer.
UPDATE "customers" c
SET
  "last_ba_user_id" = v."attended_by_user_id",
  "last_visit_at"   = v."started_at"
FROM (
  SELECT DISTINCT ON ("customer_id")
    "customer_id", "attended_by_user_id", "started_at"
  FROM "customer_visits"
  ORDER BY "customer_id", "started_at" DESC
) v
WHERE c."id" = v."customer_id";
--> statement-breakpoint

-- 5d. Backfill nextFollowUp* + openFollowUpCount + overdueFollowUpCount
--     from suggested_actions (pending = not completed and not dismissed).
UPDATE "customers" c
SET
  "next_follow_up_type"     = sa."trigger_type",
  "next_follow_up_due_date" = sa."due_date"
FROM (
  SELECT DISTINCT ON ("customer_id")
    "customer_id", "trigger_type", "due_date"
  FROM "suggested_actions"
  WHERE "completed_at" IS NULL AND "dismissed_at" IS NULL
  ORDER BY "customer_id", "due_date" ASC
) sa
WHERE c."id" = sa."customer_id";
--> statement-breakpoint

UPDATE "customers" c
SET
  "open_follow_up_count" = COALESCE(agg."open_count", 0),
  "overdue_follow_up_count" = COALESCE(agg."overdue_count", 0)
FROM (
  SELECT
    "customer_id",
    COUNT(*) FILTER (WHERE "completed_at" IS NULL AND "dismissed_at" IS NULL)::int AS "open_count",
    COUNT(*) FILTER (WHERE "completed_at" IS NULL AND "dismissed_at" IS NULL AND "due_date" < CURRENT_DATE)::int AS "overdue_count"
  FROM "suggested_actions"
  GROUP BY "customer_id"
) agg
WHERE c."id" = agg."customer_id";
--> statement-breakpoint

-- 5e. Backfill lastFollowUp* from the most recent completed suggested_action
UPDATE "customers" c
SET
  "last_follow_up_type"         = sa."trigger_type",
  "last_follow_up_completed_at" = sa."completed_at"
FROM (
  SELECT DISTINCT ON ("customer_id")
    "customer_id", "trigger_type", "completed_at"
  FROM "suggested_actions"
  WHERE "completed_at" IS NOT NULL
  ORDER BY "customer_id", "completed_at" DESC
) sa
WHERE c."id" = sa."customer_id";
