-- Keep users.zone_id in sync with their store's zone_id for ba/manager roles.
-- users.zone_id is a text column (no FK) because users.id is a Clerk text id,
-- so without this trigger a store moving to another zone leaves user rows
-- pointing at the old zone uuid.

CREATE OR REPLACE FUNCTION sync_users_zone_from_store()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.zone_id IS DISTINCT FROM OLD.zone_id THEN
    UPDATE users
       SET zone_id = NEW.zone_id::text,
           updated_at = now()
     WHERE store_id = NEW.id::text
       AND role IN ('ba', 'manager');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS stores_sync_user_zone ON stores;
--> statement-breakpoint
CREATE TRIGGER stores_sync_user_zone
AFTER UPDATE OF zone_id ON stores
FOR EACH ROW
EXECUTE FUNCTION sync_users_zone_from_store();
