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
ALTER TABLE "consents" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "consents" ADD COLUMN "signature_url" text;--> statement-breakpoint
ALTER TABLE "consents" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "privacy_notices_version_lang_idx" ON "privacy_notices" USING btree ("version","language");--> statement-breakpoint
CREATE INDEX "privacy_notices_active_idx" ON "privacy_notices" USING btree ("language","effective_from");