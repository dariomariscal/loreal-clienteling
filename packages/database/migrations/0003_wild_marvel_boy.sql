CREATE TABLE "brand_stores" (
	"brand_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brand_stores_brand_id_store_id_pk" PRIMARY KEY("brand_id","store_id")
);
--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "event_type_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "logo_url" varchar(500);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "lat" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "lng" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "brand_stores" ADD CONSTRAINT "brand_stores_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_stores" ADD CONSTRAINT "brand_stores_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brand_stores_store_idx" ON "brand_stores" USING btree ("store_id");--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "event_type";