ALTER TABLE "store_events" ADD COLUMN "event_group_id" uuid;--> statement-breakpoint
CREATE INDEX "store_events_group_idx" ON "store_events" USING btree ("event_group_id");