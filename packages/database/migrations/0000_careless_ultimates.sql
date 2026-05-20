CREATE TABLE "appointment_event_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(30) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"duration_minutes" integer DEFAULT 60,
	"color" varchar(20),
	"description" text,
	"brand_id" uuid,
	"max_capacity" integer DEFAULT 1,
	"requires_confirmation" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_event_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"ba_user_id" text NOT NULL,
	"store_id" uuid NOT NULL,
	"event_type_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"comments" text,
	"reminder_sent_at" timestamp with time zone,
	"confirmation_sent_at" timestamp with time zone,
	"is_virtual" boolean DEFAULT false NOT NULL,
	"video_link" varchar(500),
	"rescheduled_from_appointment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text,
	"action" varchar(50) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" varchar(100) NOT NULL,
	"changes" jsonb,
	"ip_address" varchar(45),
	"user_agent" varchar(500),
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"image_url" text,
	"role" text DEFAULT 'ba' NOT NULL,
	"store_id" text,
	"zone_id" text,
	"brand_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"invitation_status" text,
	"invited_at" timestamp with time zone,
	"invited_by_user_id" text,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "beauty_profile_shades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"beauty_profile_id" uuid NOT NULL,
	"category" varchar(20) NOT NULL,
	"brand_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"shade_code" varchar(50) NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"captured_by_user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beauty_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"skin_type" varchar(20),
	"skin_tone" varchar(20),
	"skin_subtone" varchar(20),
	"skin_concerns" jsonb,
	"preferred_ingredients" jsonb,
	"avoided_ingredients" jsonb,
	"fragrance_preferences" jsonb,
	"makeup_preferences" jsonb,
	"routine_type" varchar(20),
	"interests" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beauty_profiles_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "brand_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"primary_color" varchar(20),
	"secondary_color" varchar(20),
	"accent_color" varchar(20),
	"logo_url" varchar(500),
	"font_family" varchar(100),
	"message_templates" jsonb,
	"replenishment_rules" jsonb,
	"virtual_tryon_enabled" boolean DEFAULT false NOT NULL,
	"vip_threshold_amount" numeric(12, 2),
	"vip_threshold_period_months" integer DEFAULT 12,
	"communication_rules" jsonb,
	"enabled_modules" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brand_configs_brand_id_unique" UNIQUE("brand_id")
);
--> statement-breakpoint
CREATE TABLE "brand_stores" (
	"brand_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brand_stores_brand_id_store_id_pk" PRIMARY KEY("brand_id","store_id")
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"tier" varchar(20) NOT NULL,
	"logo_url" varchar(500),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brands_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "communications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"sent_by_user_id" text NOT NULL,
	"channel" varchar(20) NOT NULL,
	"template_id" uuid,
	"subject" varchar(200),
	"body" text NOT NULL,
	"followup_type" varchar(30) NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"tracking_link_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"type" varchar(30) NOT NULL,
	"version" varchar(20) NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"source" varchar(100) NOT NULL,
	"ip_address" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(320),
	"phone" varchar(20),
	"gender" varchar(20),
	"birth_date" date,
	"registered_at_store_id" uuid NOT NULL,
	"registered_by_user_id" text NOT NULL,
	"last_ba_user_id" text,
	"customer_since" timestamp with time zone DEFAULT now() NOT NULL,
	"last_contact_at" timestamp with time zone,
	"last_transaction_at" timestamp with time zone,
	"lifecycle_segment" varchar(20) DEFAULT 'new' NOT NULL,
	"inactive" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email"),
	CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid,
	"name" varchar(200) NOT NULL,
	"channel" varchar(20) NOT NULL,
	"body" text NOT NULL,
	"followup_type" varchar(30) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "municipalities" (
	"id" varchar(5) PRIMARY KEY NOT NULL,
	"state_code" varchar(2) NOT NULL,
	"state_name" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"boundary" geometry(MultiPolygon, 4326) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"stock_status" varchar(20) NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" varchar(100) NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" varchar(300) NOT NULL,
	"category" varchar(20) NOT NULL,
	"subcategory" varchar(50),
	"description" text,
	"ingredients" jsonb,
	"price" numeric(10, 2) NOT NULL,
	"images" jsonb,
	"shade_options" jsonb,
	"estimated_duration_days" integer,
	"technical_sheet_url" varchar(500),
	"tutorial_url" varchar(500),
	"sales_argument" text,
	"embedding" vector(1536),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "purchase_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" varchar(100) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"pos_transaction_id" varchar(100),
	"source" varchar(20) NOT NULL,
	"attributed_ba_user_id" text,
	"attribution_reason" varchar(30),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"ba_user_id" text NOT NULL,
	"store_id" uuid NOT NULL,
	"recommended_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" varchar(30) NOT NULL,
	"ai_reasoning" text,
	"notes" text,
	"visit_reason" varchar(30),
	"converted_to_purchase" boolean DEFAULT false NOT NULL,
	"conversion_purchase_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "samples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"ba_user_id" text NOT NULL,
	"store_id" uuid NOT NULL,
	"delivered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"converted_to_purchase" boolean DEFAULT false NOT NULL,
	"conversion_purchase_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"chain" varchar(20) NOT NULL,
	"zone_id" uuid,
	"address" varchar(500),
	"city" varchar(100),
	"state" varchar(100),
	"district" varchar(100),
	"municipality_id" varchar(5),
	"postcode" varchar(10),
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"geom" geometry(Point, 4326),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stores_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "zone_municipalities" (
	"zone_id" uuid NOT NULL,
	"municipality_id" varchar(5) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zone_municipalities_zone_id_municipality_id_pk" PRIMARY KEY("zone_id","municipality_id")
);
--> statement-breakpoint
CREATE TABLE "zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"color" varchar(7) DEFAULT '#D4AF37' NOT NULL,
	"icon" varchar(50) DEFAULT 'map-pin' NOT NULL,
	"region" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zones_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "appointment_event_types" ADD CONSTRAINT "appointment_event_types_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_ba_user_id_users_id_fk" FOREIGN KEY ("ba_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_event_type_id_appointment_event_types_id_fk" FOREIGN KEY ("event_type_id") REFERENCES "public"."appointment_event_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beauty_profile_shades" ADD CONSTRAINT "beauty_profile_shades_beauty_profile_id_beauty_profiles_id_fk" FOREIGN KEY ("beauty_profile_id") REFERENCES "public"."beauty_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beauty_profile_shades" ADD CONSTRAINT "beauty_profile_shades_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beauty_profile_shades" ADD CONSTRAINT "beauty_profile_shades_captured_by_user_id_users_id_fk" FOREIGN KEY ("captured_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beauty_profiles" ADD CONSTRAINT "beauty_profiles_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_configs" ADD CONSTRAINT "brand_configs_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_stores" ADD CONSTRAINT "brand_stores_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_stores" ADD CONSTRAINT "brand_stores_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_sent_by_user_id_users_id_fk" FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_registered_at_store_id_stores_id_fk" FOREIGN KEY ("registered_at_store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_registered_by_user_id_users_id_fk" FOREIGN KEY ("registered_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_last_ba_user_id_users_id_fk" FOREIGN KEY ("last_ba_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_availability" ADD CONSTRAINT "product_availability_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_availability" ADD CONSTRAINT "product_availability_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_attributed_ba_user_id_users_id_fk" FOREIGN KEY ("attributed_ba_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_ba_user_id_users_id_fk" FOREIGN KEY ("ba_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "samples" ADD CONSTRAINT "samples_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "samples" ADD CONSTRAINT "samples_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "samples" ADD CONSTRAINT "samples_ba_user_id_users_id_fk" FOREIGN KEY ("ba_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "samples" ADD CONSTRAINT "samples_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zone_municipalities" ADD CONSTRAINT "zone_municipalities_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zone_municipalities" ADD CONSTRAINT "zone_municipalities_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_ba_idx" ON "appointments" USING btree ("ba_user_id");--> statement-breakpoint
CREATE INDEX "appointments_store_idx" ON "appointments" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "appointments_scheduled_idx" ON "appointments" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "brand_stores_store_idx" ON "brand_stores" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "communications_customer_idx" ON "communications" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "consents_customer_idx" ON "consents" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "consents_type_idx" ON "consents" USING btree ("customer_id","type");--> statement-breakpoint
CREATE INDEX "customers_store_idx" ON "customers" USING btree ("registered_at_store_id");--> statement-breakpoint
CREATE INDEX "customers_name_idx" ON "customers" USING btree ("first_name","last_name");--> statement-breakpoint
CREATE INDEX "customers_segment_idx" ON "customers" USING btree ("lifecycle_segment");--> statement-breakpoint
CREATE INDEX "municipalities_state_idx" ON "municipalities" USING btree ("state_code");--> statement-breakpoint
CREATE INDEX "municipalities_boundary_gix" ON "municipalities" USING gist ("boundary");--> statement-breakpoint
CREATE INDEX "products_brand_idx" ON "products" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "purchases_customer_idx" ON "purchases" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "purchases_store_idx" ON "purchases" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "recommendations_customer_idx" ON "recommendations" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "recommendations_store_idx" ON "recommendations" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "stores_municipality_idx" ON "stores" USING btree ("municipality_id");--> statement-breakpoint
CREATE INDEX "stores_geom_gix" ON "stores" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "zone_municipalities_municipality_idx" ON "zone_municipalities" USING btree ("municipality_id");