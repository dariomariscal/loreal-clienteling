-- Counter Manager operations: targets, approvals, shifts, ratings, event
-- staff assignments. See rfp-loreal-clienteling/10-roles-operativos.md for
-- the counter manager scope these tables support.
--
-- IF NOT EXISTS / DO blocks are used so re-running the migration against an
-- environment that received an out-of-band partial apply stays safe. Mirrors
-- the convention established in 0003_roles_and_divisions.sql.
--
-- Note: divisions table, brands.division_id, users.division_id, users.specialty
-- and the default change on users.role were already shipped in 0003; they are
-- intentionally omitted from this file.

CREATE TABLE IF NOT EXISTS "approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(40) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"store_id" uuid NOT NULL,
	"brand_id" uuid,
	"customer_id" uuid,
	"requested_by_user_id" text NOT NULL,
	"decided_by_user_id" text,
	"reason" text,
	"decision_notes" text,
	"payload" jsonb NOT NULL,
	"decided_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ba_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reviewed_user_id" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"appointment_id" uuid,
	"score" integer NOT NULL,
	"comment" text,
	"source" varchar(30) NOT NULL,
	"submitted_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_event_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" varchar(30) DEFAULT 'staff' NOT NULL,
	"assigned_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sales_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL,
	"period" varchar(10) NOT NULL,
	"period_date" date NOT NULL,
	"target_amount" numeric(14, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"notes" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"store_id" uuid NOT NULL,
	"shift_date" date NOT NULL,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Foreign keys (wrapped in DO blocks so re-runs are safe).
DO $$ BEGIN
  ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "ba_ratings" ADD CONSTRAINT "ba_ratings_reviewed_user_id_users_id_fk" FOREIGN KEY ("reviewed_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "ba_ratings" ADD CONSTRAINT "ba_ratings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "ba_ratings" ADD CONSTRAINT "ba_ratings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "ba_ratings" ADD CONSTRAINT "ba_ratings_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "ba_ratings" ADD CONSTRAINT "ba_ratings_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "event_assignments" ADD CONSTRAINT "event_assignments_store_event_id_store_events_id_fk" FOREIGN KEY ("store_event_id") REFERENCES "public"."store_events"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "event_assignments" ADD CONSTRAINT "event_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "event_assignments" ADD CONSTRAINT "event_assignments_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales_targets" ADD CONSTRAINT "sales_targets_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales_targets" ADD CONSTRAINT "sales_targets_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales_targets" ADD CONSTRAINT "sales_targets_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "shifts" ADD CONSTRAINT "shifts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "shifts" ADD CONSTRAINT "shifts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "shifts" ADD CONSTRAINT "shifts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint

-- Indices (CREATE INDEX IF NOT EXISTS is supported in PG 9.5+)
CREATE INDEX IF NOT EXISTS "approval_requests_store_status_idx" ON "approval_requests" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approval_requests_requested_by_idx" ON "approval_requests" USING btree ("requested_by_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approval_requests_customer_idx" ON "approval_requests" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ba_ratings_reviewed_user_idx" ON "ba_ratings" USING btree ("reviewed_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ba_ratings_store_created_idx" ON "ba_ratings" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ba_ratings_customer_idx" ON "ba_ratings" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "event_assignments_event_user_idx" ON "event_assignments" USING btree ("store_event_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_assignments_user_idx" ON "event_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sales_targets_counter_period_idx" ON "sales_targets" USING btree ("store_id","brand_id","period","period_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sales_targets_store_idx" ON "sales_targets" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "shifts_user_date_idx" ON "shifts" USING btree ("user_id","shift_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shifts_store_date_idx" ON "shifts" USING btree ("store_id","shift_date");
