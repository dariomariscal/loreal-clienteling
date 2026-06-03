-- Dedup wishlist_items by (wishlist_id, product_id, variant_id).
-- Idempotent: safe to re-run if a partial apply registered the hash without
-- executing the SQL (see MIGRATIONS.md §"Recovering from a stuck migration").

-- 1. Collapse existing duplicates, keeping the oldest row per (wishlist,
--    product, variant) group. We retain the earliest added_at so any item
--    the BA curated manually first wins over later scanner re-adds.
DELETE FROM "wishlist_items" wi
USING (
  SELECT id,
         row_number() OVER (
           PARTITION BY wishlist_id, product_id, variant_id
           ORDER BY added_at, id
         ) AS rn
  FROM "wishlist_items"
) dup
WHERE wi.id = dup.id AND dup.rn > 1;

-- 2. Two partial uniques because Postgres treats NULLs as distinct in
--    standard unique indexes. One covers items that target a specific
--    variant, the other covers items without a variant (product-level).
CREATE UNIQUE INDEX IF NOT EXISTS "wishlist_items_dedup_with_variant_idx"
  ON "wishlist_items" ("wishlist_id", "product_id", "variant_id")
  WHERE "variant_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "wishlist_items_dedup_no_variant_idx"
  ON "wishlist_items" ("wishlist_id", "product_id")
  WHERE "variant_id" IS NULL;
