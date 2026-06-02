CREATE TABLE "appointment_prepared_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"status" varchar(16) DEFAULT 'prepared' NOT NULL,
	"note" text,
	"added_by_user_id" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status_changed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scheduling_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"service_type_id" uuid,
	"slot_granularity_minutes" integer DEFAULT 30 NOT NULL,
	"min_lead_time_minutes" integer,
	"max_advance_days" integer,
	"active_days" jsonb,
	"work_window_start" varchar(5),
	"work_window_end" varchar(5),
	"blackout_dates" jsonb,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_type_required_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_type_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"min_proficiency" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"category" varchar(20) DEFAULT 'service' NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skills_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "user_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"skill_id" uuid NOT NULL,
	"proficiency" integer,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "outcome_code" varchar(30);--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "confirmed_by_customer_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "cancelled_by_user_id" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "cancellation_reason" varchar(40);--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "no_show_reason" varchar(40);--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "series_id" uuid;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "series_sequence" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "appointment_id" uuid;--> statement-breakpoint
ALTER TABLE "service_types" ADD COLUMN "buffer_before_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "service_types" ADD COLUMN "buffer_after_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "service_types" ADD COLUMN "price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "service_types" ADD COLUMN "min_lead_time_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "service_types" ADD COLUMN "max_advance_days" integer DEFAULT 90 NOT NULL;--> statement-breakpoint
ALTER TABLE "appointment_prepared_products" ADD CONSTRAINT "appointment_prepared_products_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_prepared_products" ADD CONSTRAINT "appointment_prepared_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_prepared_products" ADD CONSTRAINT "appointment_prepared_products_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_prepared_products" ADD CONSTRAINT "appointment_prepared_products_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_policies" ADD CONSTRAINT "scheduling_policies_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_policies" ADD CONSTRAINT "scheduling_policies_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "public"."service_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_type_required_skills" ADD CONSTRAINT "service_type_required_skills_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "public"."service_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_type_required_skills" ADD CONSTRAINT "service_type_required_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointment_prepared_products_appt_idx" ON "appointment_prepared_products" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "appointment_prepared_products_product_idx" ON "appointment_prepared_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "scheduling_policies_store_idx" ON "scheduling_policies" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "scheduling_policies_service_idx" ON "scheduling_policies" USING btree ("service_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "service_type_required_skills_idx" ON "service_type_required_skills" USING btree ("service_type_id","skill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_skills_user_skill_idx" ON "user_skills" USING btree ("user_id","skill_id");--> statement-breakpoint
CREATE INDEX "user_skills_skill_idx" ON "user_skills" USING btree ("skill_id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_cancelled_by_user_id_users_id_fk" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_series_idx" ON "appointments" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "appointments_status_idx" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_appointment_idx" ON "orders" USING btree ("appointment_id");