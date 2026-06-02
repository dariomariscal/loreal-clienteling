CREATE TABLE "scan_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"variant_id" uuid NOT NULL,
	"customer_id" uuid,
	"store_id" uuid NOT NULL,
	"action_taken" varchar(32),
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "samples" ADD COLUMN "variant_id" uuid;--> statement-breakpoint
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scan_events_user_scanned_idx" ON "scan_events" USING btree ("user_id","scanned_at");--> statement-breakpoint
CREATE INDEX "scan_events_customer_idx" ON "scan_events" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "scan_events_variant_idx" ON "scan_events" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "scan_events_store_scanned_idx" ON "scan_events" USING btree ("store_id","scanned_at");--> statement-breakpoint
ALTER TABLE "samples" ADD CONSTRAINT "samples_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;