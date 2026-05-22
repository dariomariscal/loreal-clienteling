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
CREATE TABLE "customer_note_embeddings" (
	"customer_note_id" uuid PRIMARY KEY NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"model" varchar(64) NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"ba_user_id" text NOT NULL,
	"for_date" date NOT NULL,
	"reason" varchar(32) NOT NULL,
	"summary" text NOT NULL,
	"suggested_action" text NOT NULL,
	"suggested_message_draft" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"dismissed_at" timestamp with time zone,
	"acted_at" timestamp with time zone,
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
ALTER TABLE "communications" ALTER COLUMN "sent_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "communications" ALTER COLUMN "followup_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "communications" ADD COLUMN "direction" varchar(12) DEFAULT 'outbound' NOT NULL;--> statement-breakpoint
ALTER TABLE "communications" ADD COLUMN "status" varchar(16) DEFAULT 'sent' NOT NULL;--> statement-breakpoint
ALTER TABLE "communications" ADD COLUMN "from_address" varchar(320);--> statement-breakpoint
ALTER TABLE "communications" ADD COLUMN "to_address" varchar(320);--> statement-breakpoint
ALTER TABLE "communications" ADD COLUMN "external_id" varchar(128);--> statement-breakpoint
ALTER TABLE "communications" ADD COLUMN "failure_reason" text;--> statement-breakpoint
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_ai_summaries" ADD CONSTRAINT "customer_ai_summaries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_embeddings" ADD CONSTRAINT "customer_embeddings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_note_embeddings" ADD CONSTRAINT "customer_note_embeddings_customer_note_id_customer_notes_id_fk" FOREIGN KEY ("customer_note_id") REFERENCES "public"."customer_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_opportunities" ADD CONSTRAINT "customer_opportunities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_opportunities" ADD CONSTRAINT "customer_opportunities_ba_user_id_users_id_fk" FOREIGN KEY ("ba_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_embeddings" ADD CONSTRAINT "product_embeddings_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_transcriptions" ADD CONSTRAINT "voice_transcriptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_transcriptions" ADD CONSTRAINT "voice_transcriptions_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_logs_user_created_idx" ON "ai_usage_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_logs_feature_created_idx" ON "ai_usage_logs" USING btree ("feature","created_at");--> statement-breakpoint
CREATE INDEX "customer_embeddings_hnsw_idx" ON "customer_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "customer_note_embeddings_hnsw_idx" ON "customer_note_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "customer_opportunities_ba_date_idx" ON "customer_opportunities" USING btree ("ba_user_id","for_date");--> statement-breakpoint
CREATE INDEX "customer_opportunities_customer_idx" ON "customer_opportunities" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "product_embeddings_hnsw_idx" ON "product_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "voice_transcriptions_customer_idx" ON "voice_transcriptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "voice_transcriptions_author_idx" ON "voice_transcriptions" USING btree ("author_user_id");--> statement-breakpoint
CREATE INDEX "communications_customer_sent_idx" ON "communications" USING btree ("customer_id","sent_at");--> statement-breakpoint
CREATE INDEX "communications_external_id_idx" ON "communications" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "communications_direction_status_idx" ON "communications" USING btree ("direction","status");