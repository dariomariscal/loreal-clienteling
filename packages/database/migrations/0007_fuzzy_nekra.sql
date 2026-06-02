CREATE TABLE "customer_visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"attended_by_user_id" text NOT NULL,
	"appointment_id" uuid,
	"visit_channel" varchar(20) DEFAULT 'in_store' NOT NULL,
	"visit_number" integer NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_minutes" integer,
	"booked_reason" varchar(40),
	"visit_reason" varchar(40),
	"status" varchar(20) DEFAULT 'in_progress' NOT NULL,
	"outcome" varchar(30),
	"party_size" integer DEFAULT 1 NOT NULL,
	"sentiment" varchar(10),
	"products_viewed" jsonb,
	"notes" text,
	"converted_order_id" uuid,
	"follow_up_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_media" ADD COLUMN "visit_id" uuid;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "visit_id" uuid;--> statement-breakpoint
ALTER TABLE "recommendations" ADD COLUMN "visit_id" uuid;--> statement-breakpoint
ALTER TABLE "samples" ADD COLUMN "visit_id" uuid;--> statement-breakpoint
ALTER TABLE "customer_visits" ADD CONSTRAINT "customer_visits_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_visits" ADD CONSTRAINT "customer_visits_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_visits" ADD CONSTRAINT "customer_visits_attended_by_user_id_users_id_fk" FOREIGN KEY ("attended_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_visits" ADD CONSTRAINT "customer_visits_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_visits_customer_started_idx" ON "customer_visits" USING btree ("customer_id","started_at");--> statement-breakpoint
CREATE INDEX "customer_visits_store_started_idx" ON "customer_visits" USING btree ("store_id","started_at");--> statement-breakpoint
CREATE INDEX "customer_visits_attended_by_idx" ON "customer_visits" USING btree ("attended_by_user_id");--> statement-breakpoint
CREATE INDEX "customer_visits_status_idx" ON "customer_visits" USING btree ("status");--> statement-breakpoint
CREATE INDEX "customer_visits_visit_reason_idx" ON "customer_visits" USING btree ("visit_reason");--> statement-breakpoint
CREATE INDEX "customer_visits_appointment_idx" ON "customer_visits" USING btree ("appointment_id");--> statement-breakpoint
ALTER TABLE "customer_media" ADD CONSTRAINT "customer_media_visit_id_customer_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."customer_visits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_visit_id_customer_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."customer_visits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_visit_id_customer_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."customer_visits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "samples" ADD CONSTRAINT "samples_visit_id_customer_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."customer_visits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_media_visit_idx" ON "customer_media" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "notes_visit_idx" ON "notes" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "recommendations_visit_idx" ON "recommendations" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "samples_visit_idx" ON "samples" USING btree ("visit_id");