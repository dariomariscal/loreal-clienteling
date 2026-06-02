ALTER TABLE "recommendations" ADD COLUMN "reason_signals" jsonb;--> statement-breakpoint
ALTER TABLE "recommendations" ADD COLUMN "engine_score" numeric(4, 3);