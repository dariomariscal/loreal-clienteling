CREATE TABLE "abandoned_carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"items" jsonb NOT NULL,
	"total_value" numeric(12, 2) NOT NULL,
	"abandoned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recovered_order_id" uuid,
	"recovered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"feature" varchar(64) NOT NULL,
	"provider" varchar(32) NOT NULL,
	"model" varchar(64) NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cached_tokens" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer NOT NULL,
	"cost_usd" numeric(12, 6) DEFAULT '0' NOT NULL,
	"status" varchar(16) DEFAULT 'success' NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"staff_user_id" text NOT NULL,
	"store_id" uuid NOT NULL,
	"service_type_id" uuid NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"pre_form" jsonb,
	"service_outcome" jsonb,
	"reminder_sent_at" timestamp with time zone,
	"confirmation_sent_at" timestamp with time zone,
	"is_virtual" boolean DEFAULT false NOT NULL,
	"meeting_url" varchar(500),
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
	"avatar_url" text,
	"role" text DEFAULT 'ba' NOT NULL,
	"store_id" text,
	"zone_id" text,
	"brand_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"invitation_status" text,
	"invited_at" timestamp with time zone,
	"invited_by_user_id" text,
	"last_sign_in_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "beauty_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"skin_type" varchar(20),
	"skin_tone" varchar(20),
	"fitzpatrick_scale" varchar(3),
	"undertone" varchar(20),
	"skin_concerns" jsonb,
	"preferred_ingredients" jsonb,
	"avoided_ingredients" jsonb,
	"hair_type" varchar(20),
	"hair_texture" varchar(20),
	"hair_color_current" varchar(50),
	"last_color_treatment_at" timestamp with time zone,
	"fragrance_families" jsonb,
	"makeup_preferences" jsonb,
	"interests" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beauty_profiles_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "shade_matches" (
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
CREATE TABLE "brand_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"primary_color" varchar(20),
	"secondary_color" varchar(20),
	"accent_color" varchar(20),
	"logo_url" varchar(500),
	"font_family" varchar(100),
	"replenishment_rules" jsonb,
	"is_virtual_tryon_enabled" boolean DEFAULT false NOT NULL,
	"vip_threshold_amount" numeric(12, 2),
	"vip_threshold_period_months" integer DEFAULT 12,
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
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brands_code_unique" UNIQUE("code")
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
	"user_agent" text,
	"signature_url" text,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_ai_summaries" (
	"customer_id" uuid PRIMARY KEY NOT NULL,
	"summary_text" text NOT NULL,
	"model" varchar(64) NOT NULL,
	"prompt_version" varchar(32) NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_embeddings" (
	"customer_id" uuid PRIMARY KEY NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"model" varchar(64) NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"appointment_id" uuid,
	"captured_by_user_id" text NOT NULL,
	"kind" varchar(20) NOT NULL,
	"media_type" varchar(20) DEFAULT 'image' NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"caption" text,
	"tags" jsonb,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_routines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"slot" varchar(10) NOT NULL,
	"step_order" integer NOT NULL,
	"product_id" uuid,
	"external_brand" varchar(100),
	"external_product_name" varchar(200),
	"added_by_user_id" text NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"since_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" text,
	"brand_id" uuid,
	"name" varchar(200) NOT NULL,
	"description" text,
	"filter" jsonb NOT NULL,
	"is_dynamic" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(320),
	"phone" varchar(20),
	"avatar_url" varchar(500),
	"gender" varchar(20),
	"birthday" date,
	"preferred_language" varchar(10) DEFAULT 'es-MX' NOT NULL,
	"preferred_channel" varchar(20),
	"accepts_marketing_email" boolean DEFAULT false NOT NULL,
	"accepts_marketing_sms" boolean DEFAULT false NOT NULL,
	"accepts_marketing_whatsapp" boolean DEFAULT false NOT NULL,
	"tax_id" varchar(20),
	"signup_store_id" uuid NOT NULL,
	"created_by_user_id" text NOT NULL,
	"assigned_to_user_id" text,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_interaction_at" timestamp with time zone,
	"last_order_at" timestamp with time zone,
	"total_spent" numeric(14, 2) DEFAULT '0' NOT NULL,
	"orders_count" integer DEFAULT 0 NOT NULL,
	"average_order_value" numeric(12, 2) DEFAULT '0' NOT NULL,
	"loyalty_tier" varchar(20),
	"loyalty_points" integer DEFAULT 0 NOT NULL,
	"lifecycle_stage" varchar(20) DEFAULT 'new' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email"),
	CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "event_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_event_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"rsvp_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"rsvp_at" timestamp with time zone,
	"attended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"store_id" uuid NOT NULL,
	"available_quantity" integer DEFAULT 0 NOT NULL,
	"committed_quantity" integer DEFAULT 0 NOT NULL,
	"incoming_quantity" integer DEFAULT 0 NOT NULL,
	"stock_status" varchar(20) NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" varchar(100) NOT NULL,
	"title" varchar(300) NOT NULL,
	"variant_title" varchar(200),
	"quantity" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"total_discount" numeric(10, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid,
	"name" varchar(200) NOT NULL,
	"channel" varchar(20) NOT NULL,
	"body" text NOT NULL,
	"campaign_type" varchar(30) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"sent_by_user_id" text,
	"direction" varchar(12) DEFAULT 'outbound' NOT NULL,
	"channel" varchar(20) NOT NULL,
	"status" varchar(16) DEFAULT 'sent' NOT NULL,
	"from_address" varchar(320),
	"to_address" varchar(320),
	"provider_message_id" varchar(128),
	"template_id" uuid,
	"subject" varchar(200),
	"body" text NOT NULL,
	"attachments" jsonb,
	"campaign_type" varchar(30),
	"appointment_id" uuid,
	"suggested_action_id" uuid,
	"tracking_link_id" uuid,
	"failure_reason" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "note_embeddings" (
	"note_id" uuid PRIMARY KEY NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"model" varchar(64) NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"body" text NOT NULL,
	"product_id" uuid,
	"is_private" boolean DEFAULT false NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" varchar(30) NOT NULL,
	"customer_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"channel" varchar(20) DEFAULT 'in_store' NOT NULL,
	"source_name" varchar(50),
	"external_order_id" varchar(100),
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"subtotal_price" numeric(12, 2) NOT NULL,
	"total_tax" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_discounts" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_shipping" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_price" numeric(12, 2) NOT NULL,
	"financial_status" varchar(20) DEFAULT 'paid' NOT NULL,
	"fulfillment_status" varchar(20) DEFAULT 'fulfilled' NOT NULL,
	"attributed_user_id" text,
	"attribution_source" varchar(30),
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "privacy_notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" varchar(20) NOT NULL,
	"language" varchar(10) DEFAULT 'es-MX' NOT NULL,
	"title" varchar(200) NOT NULL,
	"body_markdown" text NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_embeddings" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"model" varchar(64) NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"store_id" uuid NOT NULL,
	"reserved_by_user_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"hold_until" timestamp with time zone NOT NULL,
	"status" varchar(20) DEFAULT 'held' NOT NULL,
	"picked_up_at" timestamp with time zone,
	"fulfilled_order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" varchar(100) NOT NULL,
	"title" varchar(200) NOT NULL,
	"option1" varchar(100),
	"option2" varchar(100),
	"option3" varchar(100),
	"price" numeric(10, 2) NOT NULL,
	"compare_at_price" numeric(10, 2),
	"barcode" varchar(50),
	"image_url" varchar(500),
	"swatch_hex" varchar(7),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" varchar(100) NOT NULL,
	"barcode" varchar(50),
	"brand_id" uuid NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"product_type" varchar(50),
	"category" varchar(20) NOT NULL,
	"subcategory" varchar(50),
	"tags" jsonb,
	"claims" jsonb,
	"target_concerns" jsonb,
	"format_type" varchar(30),
	"ingredients" jsonb,
	"images" jsonb,
	"price" numeric(10, 2) NOT NULL,
	"compare_at_price" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"weight" numeric(8, 3),
	"weight_unit" varchar(5) DEFAULT 'g',
	"replenishment_days" integer,
	"technical_sheet_url" varchar(500),
	"tutorial_url" varchar(500),
	"talking_points" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"recommended_by_user_id" text NOT NULL,
	"store_id" uuid NOT NULL,
	"recommended_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" varchar(30) NOT NULL,
	"ai_reasoning" text,
	"notes" text,
	"visit_purpose" varchar(30),
	"appointment_id" uuid,
	"message_id" uuid,
	"wishlist_id" uuid,
	"is_converted" boolean DEFAULT false NOT NULL,
	"converted_order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "samples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"delivered_by_user_id" text NOT NULL,
	"store_id" uuid NOT NULL,
	"delivered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_converted" boolean DEFAULT false NOT NULL,
	"converted_order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_types" (
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
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "skin_diagnostics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"appointment_id" uuid,
	"captured_by_user_id" text,
	"photo_url" text NOT NULL,
	"biomarkers" jsonb,
	"overall_skin_age" integer,
	"overall_score" numeric(4, 2),
	"recommended_product_ids" jsonb,
	"provider" varchar(32) NOT NULL,
	"model" varchar(64) NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"brand_id" uuid,
	"name" varchar(200) NOT NULL,
	"description" text,
	"kind" varchar(30) NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"capacity" integer,
	"cover_image_url" varchar(500),
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"banner" varchar(20) NOT NULL,
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
	"phone" varchar(20),
	"hours" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stores_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "suggested_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"assigned_to_user_id" text NOT NULL,
	"due_date" date NOT NULL,
	"trigger_type" varchar(32) NOT NULL,
	"description" text NOT NULL,
	"recommended_action" text NOT NULL,
	"suggested_message_draft" text,
	"product_id" uuid,
	"service_type_id" uuid,
	"priority" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracking_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"short_code" varchar(20) NOT NULL,
	"created_by_user_id" text NOT NULL,
	"customer_id" uuid,
	"product_id" uuid,
	"wishlist_id" uuid,
	"destination_url" text NOT NULL,
	"label" varchar(100),
	"clicks_count" integer DEFAULT 0 NOT NULL,
	"last_clicked_at" timestamp with time zone,
	"converted_order_id" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tracking_links_short_code_unique" UNIQUE("short_code")
);
--> statement-breakpoint
CREATE TABLE "voice_transcriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid,
	"author_user_id" text NOT NULL,
	"audio_url" text,
	"transcript" text NOT NULL,
	"language" varchar(8) NOT NULL,
	"provider" varchar(32) NOT NULL,
	"model" varchar(64) NOT NULL,
	"duration_seconds" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wishlist_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"note" text,
	"position" integer DEFAULT 0 NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"created_by_user_id" text NOT NULL,
	"name" varchar(200) NOT NULL,
	"kind" varchar(20) DEFAULT 'wishlist' NOT NULL,
	"description" text,
	"shared_at" timestamp with time zone,
	"shared_via" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zones_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "abandoned_carts" ADD CONSTRAINT "abandoned_carts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_staff_user_id_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "public"."service_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beauty_profiles" ADD CONSTRAINT "beauty_profiles_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shade_matches" ADD CONSTRAINT "shade_matches_beauty_profile_id_beauty_profiles_id_fk" FOREIGN KEY ("beauty_profile_id") REFERENCES "public"."beauty_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shade_matches" ADD CONSTRAINT "shade_matches_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shade_matches" ADD CONSTRAINT "shade_matches_captured_by_user_id_users_id_fk" FOREIGN KEY ("captured_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_configs" ADD CONSTRAINT "brand_configs_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_stores" ADD CONSTRAINT "brand_stores_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_stores" ADD CONSTRAINT "brand_stores_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_ai_summaries" ADD CONSTRAINT "customer_ai_summaries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_embeddings" ADD CONSTRAINT "customer_embeddings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_media" ADD CONSTRAINT "customer_media_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_media" ADD CONSTRAINT "customer_media_captured_by_user_id_users_id_fk" FOREIGN KEY ("captured_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_routines" ADD CONSTRAINT "customer_routines_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_routines" ADD CONSTRAINT "customer_routines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_routines" ADD CONSTRAINT "customer_routines_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_segments" ADD CONSTRAINT "customer_segments_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_segments" ADD CONSTRAINT "customer_segments_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_signup_store_id_stores_id_fk" FOREIGN KEY ("signup_store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_invitations" ADD CONSTRAINT "event_invitations_store_event_id_store_events_id_fk" FOREIGN KEY ("store_event_id") REFERENCES "public"."store_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_invitations" ADD CONSTRAINT "event_invitations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_invitations" ADD CONSTRAINT "event_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_levels" ADD CONSTRAINT "inventory_levels_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_levels" ADD CONSTRAINT "inventory_levels_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_levels" ADD CONSTRAINT "inventory_levels_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_items" ADD CONSTRAINT "line_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_items" ADD CONSTRAINT "line_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sent_by_user_id_users_id_fk" FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_embeddings" ADD CONSTRAINT "note_embeddings_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_attributed_user_id_users_id_fk" FOREIGN KEY ("attributed_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_embeddings" ADD CONSTRAINT "product_embeddings_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reservations" ADD CONSTRAINT "product_reservations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reservations" ADD CONSTRAINT "product_reservations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reservations" ADD CONSTRAINT "product_reservations_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reservations" ADD CONSTRAINT "product_reservations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reservations" ADD CONSTRAINT "product_reservations_reserved_by_user_id_users_id_fk" FOREIGN KEY ("reserved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_recommended_by_user_id_users_id_fk" FOREIGN KEY ("recommended_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "samples" ADD CONSTRAINT "samples_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "samples" ADD CONSTRAINT "samples_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "samples" ADD CONSTRAINT "samples_delivered_by_user_id_users_id_fk" FOREIGN KEY ("delivered_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "samples" ADD CONSTRAINT "samples_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skin_diagnostics" ADD CONSTRAINT "skin_diagnostics_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skin_diagnostics" ADD CONSTRAINT "skin_diagnostics_captured_by_user_id_users_id_fk" FOREIGN KEY ("captured_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_events" ADD CONSTRAINT "store_events_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_events" ADD CONSTRAINT "store_events_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggested_actions" ADD CONSTRAINT "suggested_actions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggested_actions" ADD CONSTRAINT "suggested_actions_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggested_actions" ADD CONSTRAINT "suggested_actions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggested_actions" ADD CONSTRAINT "suggested_actions_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "public"."service_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_links" ADD CONSTRAINT "tracking_links_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_links" ADD CONSTRAINT "tracking_links_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_links" ADD CONSTRAINT "tracking_links_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_links" ADD CONSTRAINT "tracking_links_wishlist_id_wishlists_id_fk" FOREIGN KEY ("wishlist_id") REFERENCES "public"."wishlists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_transcriptions" ADD CONSTRAINT "voice_transcriptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_transcriptions" ADD CONSTRAINT "voice_transcriptions_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_wishlist_id_wishlists_id_fk" FOREIGN KEY ("wishlist_id") REFERENCES "public"."wishlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zone_municipalities" ADD CONSTRAINT "zone_municipalities_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zone_municipalities" ADD CONSTRAINT "zone_municipalities_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "abandoned_carts_customer_idx" ON "abandoned_carts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "ai_usage_logs_user_created_idx" ON "ai_usage_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_logs_feature_created_idx" ON "ai_usage_logs" USING btree ("feature","created_at");--> statement-breakpoint
CREATE INDEX "appointments_staff_idx" ON "appointments" USING btree ("staff_user_id");--> statement-breakpoint
CREATE INDEX "appointments_store_idx" ON "appointments" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "appointments_start_idx" ON "appointments" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "appointments_customer_idx" ON "appointments" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "brand_stores_store_idx" ON "brand_stores" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "consents_customer_idx" ON "consents" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "consents_type_idx" ON "consents" USING btree ("customer_id","type");--> statement-breakpoint
CREATE INDEX "customer_embeddings_hnsw_idx" ON "customer_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "customer_media_customer_idx" ON "customer_media" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_media_appointment_idx" ON "customer_media" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "customer_routines_customer_slot_idx" ON "customer_routines" USING btree ("customer_id","slot");--> statement-breakpoint
CREATE INDEX "customer_segments_owner_idx" ON "customer_segments" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "customer_segments_brand_idx" ON "customer_segments" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "customers_store_idx" ON "customers" USING btree ("signup_store_id");--> statement-breakpoint
CREATE INDEX "customers_name_idx" ON "customers" USING btree ("first_name","last_name");--> statement-breakpoint
CREATE INDEX "customers_lifecycle_idx" ON "customers" USING btree ("lifecycle_stage");--> statement-breakpoint
CREATE INDEX "customers_assigned_idx" ON "customers" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "event_invitations_event_idx" ON "event_invitations" USING btree ("store_event_id");--> statement-breakpoint
CREATE INDEX "event_invitations_customer_idx" ON "event_invitations" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_levels_product_variant_store_idx" ON "inventory_levels" USING btree ("product_id","variant_id","store_id");--> statement-breakpoint
CREATE INDEX "inventory_levels_store_idx" ON "inventory_levels" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "line_items_order_idx" ON "line_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "messages_customer_idx" ON "messages" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "messages_customer_sent_idx" ON "messages" USING btree ("customer_id","sent_at");--> statement-breakpoint
CREATE INDEX "messages_provider_message_id_idx" ON "messages" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "messages_direction_status_idx" ON "messages" USING btree ("direction","status");--> statement-breakpoint
CREATE INDEX "municipalities_state_idx" ON "municipalities" USING btree ("state_code");--> statement-breakpoint
CREATE INDEX "municipalities_boundary_gix" ON "municipalities" USING gist ("boundary");--> statement-breakpoint
CREATE INDEX "note_embeddings_hnsw_idx" ON "note_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "notes_customer_idx" ON "notes" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "notes_created_by_idx" ON "notes" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_store_idx" ON "orders" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "orders_attributed_idx" ON "orders" USING btree ("attributed_user_id");--> statement-breakpoint
CREATE INDEX "orders_processed_idx" ON "orders" USING btree ("processed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "privacy_notices_version_lang_idx" ON "privacy_notices" USING btree ("version","language");--> statement-breakpoint
CREATE INDEX "privacy_notices_active_idx" ON "privacy_notices" USING btree ("language","effective_from");--> statement-breakpoint
CREATE INDEX "product_embeddings_hnsw_idx" ON "product_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "product_reservations_customer_idx" ON "product_reservations" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "product_reservations_store_status_idx" ON "product_reservations" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "product_variants_product_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "products_brand_idx" ON "products" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "products_product_type_idx" ON "products" USING btree ("product_type");--> statement-breakpoint
CREATE INDEX "recommendations_customer_idx" ON "recommendations" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "recommendations_store_idx" ON "recommendations" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "recommendations_recommended_by_idx" ON "recommendations" USING btree ("recommended_by_user_id");--> statement-breakpoint
CREATE INDEX "samples_customer_idx" ON "samples" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "samples_store_idx" ON "samples" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "skin_diagnostics_customer_idx" ON "skin_diagnostics" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "skin_diagnostics_captured_idx" ON "skin_diagnostics" USING btree ("captured_at");--> statement-breakpoint
CREATE INDEX "store_events_store_start_idx" ON "store_events" USING btree ("store_id","start_time");--> statement-breakpoint
CREATE INDEX "stores_municipality_idx" ON "stores" USING btree ("municipality_id");--> statement-breakpoint
CREATE INDEX "stores_geom_gix" ON "stores" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "suggested_actions_assignee_due_idx" ON "suggested_actions" USING btree ("assigned_to_user_id","due_date");--> statement-breakpoint
CREATE INDEX "suggested_actions_customer_idx" ON "suggested_actions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "tracking_links_created_by_idx" ON "tracking_links" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "tracking_links_customer_idx" ON "tracking_links" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "voice_transcriptions_customer_idx" ON "voice_transcriptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "voice_transcriptions_author_idx" ON "voice_transcriptions" USING btree ("author_user_id");--> statement-breakpoint
CREATE INDEX "wishlist_items_wishlist_idx" ON "wishlist_items" USING btree ("wishlist_id");--> statement-breakpoint
CREATE INDEX "wishlists_customer_idx" ON "wishlists" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "wishlists_created_by_idx" ON "wishlists" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "zone_municipalities_municipality_idx" ON "zone_municipalities" USING btree ("municipality_id");