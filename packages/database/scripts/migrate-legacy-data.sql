-- =============================================================================
-- Migrate legacy data (loreal_legacy) → new schema (loreal_clienteling)
--
-- Strategy: mount `loreal_legacy` as a postgres_fdw foreign server, import
-- its public schema under `legacy.*`, then INSERT ... SELECT into the new
-- tables with renames + defaults for the new columns.
--
-- Idempotent: TRUNCATEs all target tables first, then re-inserts. Safe to
-- re-run.
--
-- Run with:
--   psql "postgresql://loreal:loreal@localhost:5433/loreal_clienteling" \
--     -f packages/database/scripts/migrate-legacy-data.sql
-- =============================================================================

BEGIN;

-- ─── 1. Mount loreal_legacy as a foreign schema ──────────────────────────────

DROP SERVER IF EXISTS legacy_srv CASCADE;

-- Connect from *inside* the Postgres container — port 5432 (not the host's 5433)
-- and 127.0.0.1 on the container's loopback.
CREATE SERVER legacy_srv
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host '127.0.0.1', port '5432', dbname 'loreal_legacy');

CREATE USER MAPPING FOR loreal
  SERVER legacy_srv
  OPTIONS (user 'loreal', password 'loreal');

DROP SCHEMA IF EXISTS legacy CASCADE;
CREATE SCHEMA legacy;

IMPORT FOREIGN SCHEMA public
  FROM SERVER legacy_srv
  INTO legacy;

-- ─── 2. Truncate target tables in dependency-safe order ──────────────────────
-- CASCADE so we don't have to enumerate FKs.

TRUNCATE TABLE
  shade_matches,
  beauty_profiles,
  notes,
  customer_routines,
  customer_media,
  skin_diagnostics,
  recommendations,
  samples,
  wishlist_items,
  wishlists,
  product_reservations,
  abandoned_carts,
  line_items,
  orders,
  appointments,
  event_invitations,
  store_events,
  suggested_actions,
  customer_segments,
  messages,
  message_templates,
  tracking_links,
  voice_transcriptions,
  customer_ai_summaries,
  customer_embeddings,
  note_embeddings,
  product_embeddings,
  inventory_levels,
  product_variants,
  products,
  service_types,
  consents,
  privacy_notices,
  audit_logs,
  ai_usage_logs,
  customers,
  users,
  brand_stores,
  brand_configs,
  brands,
  stores,
  zone_municipalities,
  zones,
  municipalities
CASCADE;

-- ─── 3. Reference / lookup data (no FKs to other public tables) ──────────────

INSERT INTO municipalities (id, state_code, state_name, name, boundary, created_at)
SELECT id, state_code, state_name, name, boundary, created_at
FROM legacy.municipalities;

INSERT INTO zones (id, code, display_name, color, icon, created_at, updated_at)
SELECT id, code, display_name, color, icon, created_at, updated_at
FROM legacy.zones;

INSERT INTO zone_municipalities (zone_id, municipality_id, created_at)
SELECT zone_id, municipality_id, created_at
FROM legacy.zone_municipalities;

INSERT INTO privacy_notices (id, version, language, title, body_markdown, effective_from, effective_to, created_at)
SELECT id, version, language, title, body_markdown, effective_from, effective_to, created_at
FROM legacy.privacy_notices;

-- ─── 4. Brands, stores, brand_stores ─────────────────────────────────────────

INSERT INTO brands (id, code, display_name, tier, logo_url, is_active, created_at, updated_at)
SELECT id, code, display_name, tier, logo_url, active, created_at, updated_at
FROM legacy.brands;

INSERT INTO brand_configs (
  id, brand_id, primary_color, secondary_color, accent_color, logo_url, font_family,
  replenishment_rules, is_virtual_tryon_enabled, vip_threshold_amount,
  vip_threshold_period_months, created_at, updated_at
)
SELECT
  id, brand_id, primary_color, secondary_color, accent_color, logo_url, font_family,
  replenishment_rules, virtual_tryon_enabled, vip_threshold_amount,
  vip_threshold_period_months, created_at, updated_at
FROM legacy.brand_configs;

INSERT INTO stores (
  id, code, display_name, banner, zone_id, address, city, state, district,
  municipality_id, postcode, lat, lng, geom, phone, hours, is_active,
  created_at, updated_at
)
SELECT
  id, code, display_name, chain, zone_id, address, city, state, district,
  municipality_id, postcode, lat, lng, geom, phone, hours, active,
  created_at, updated_at
FROM legacy.stores;

INSERT INTO brand_stores (brand_id, store_id, created_at)
SELECT brand_id, store_id, created_at
FROM legacy.brand_stores;

-- ─── 5. Users (Clerk mirror) ─────────────────────────────────────────────────

INSERT INTO users (
  id, email, full_name, avatar_url, role, store_id, zone_id, brand_id,
  is_active, invitation_status, invited_at, invited_by_user_id,
  last_sign_in_at, created_at, updated_at
)
SELECT
  id, email, full_name, image_url, role, store_id, zone_id, brand_id,
  active, invitation_status, invited_at, invited_by_user_id,
  last_login_at, created_at, updated_at
FROM legacy.users;

-- ─── 6. Customers ────────────────────────────────────────────────────────────
-- Renames: birth_date→birthday, registered_at_store_id→signup_store_id,
-- registered_by_user_id→created_by_user_id, last_ba_user_id→assigned_to_user_id,
-- customer_since→enrolled_at, last_contact_at→last_interaction_at,
-- last_transaction_at→last_order_at, lifecycle_segment→lifecycle_stage,
-- inactive→is_active (inverted)
-- New fields default: avatar_url=null, preferred_*=defaults, accepts_*=false,
-- total_spent=0, orders_count=0, average_order_value=0, loyalty_*=null/0

INSERT INTO customers (
  id, first_name, last_name, email, phone, gender, birthday,
  signup_store_id, created_by_user_id, assigned_to_user_id,
  enrolled_at, last_interaction_at, last_order_at,
  lifecycle_stage, is_active,
  created_at, updated_at
)
SELECT
  id, first_name, last_name, email, phone, gender, birth_date,
  registered_at_store_id, registered_by_user_id, last_ba_user_id,
  customer_since, last_contact_at, last_transaction_at,
  lifecycle_segment, NOT inactive,
  created_at, updated_at
FROM legacy.customers;

-- ─── 7. Beauty profiles (rename skin_subtone→undertone, fragrance_preferences→fragrance_families) ─

INSERT INTO beauty_profiles (
  id, customer_id, skin_type, skin_tone, undertone,
  skin_concerns, preferred_ingredients, avoided_ingredients,
  fragrance_families, makeup_preferences, interests,
  created_at, updated_at
)
SELECT
  id, customer_id, skin_type, skin_tone, skin_subtone,
  skin_concerns, preferred_ingredients, avoided_ingredients,
  fragrance_preferences, makeup_preferences, interests,
  created_at, updated_at
FROM legacy.beauty_profiles;

-- shade_matches (was beauty_profile_shades) — currently empty (0 rows).
INSERT INTO shade_matches (
  id, beauty_profile_id, category, brand_id, product_id, shade_code,
  captured_at, captured_by_user_id
)
SELECT
  id, beauty_profile_id, category, brand_id, product_id, shade_code,
  captured_at, captured_by_user_id
FROM legacy.beauty_profile_shades;

-- ─── 8. Products (rename name→title, active→status, add product_type=null) ───

INSERT INTO products (
  id, sku, brand_id, title, description, category, subcategory,
  ingredients, price, currency, images, replenishment_days,
  technical_sheet_url, tutorial_url, talking_points, status,
  created_at, updated_at
)
SELECT
  id, sku, brand_id, name, description, category, subcategory,
  ingredients, price, 'MXN', images, estimated_duration_days,
  technical_sheet_url, tutorial_url, sales_argument,
  CASE WHEN active THEN 'active' ELSE 'archived' END,
  created_at, updated_at
FROM legacy.products;

-- product_variants — new table, no legacy source. Leave empty.

-- product_availability → inventory_levels (rename + add quantity fields=0)
INSERT INTO inventory_levels (
  id, product_id, variant_id, store_id,
  available_quantity, committed_quantity, incoming_quantity,
  stock_status, last_synced_at, updated_at
)
SELECT
  id, product_id, NULL, store_id,
  0, 0, 0,
  stock_status, last_synced_at, last_synced_at
FROM legacy.product_availability;

INSERT INTO product_embeddings (product_id, embedding, model, generated_at)
SELECT product_id, embedding, model, generated_at
FROM legacy.product_embeddings;

-- ─── 9. Service types (was appointment_event_types, rename active→is_active) ─

INSERT INTO service_types (
  id, code, display_name, duration_minutes, color, description,
  brand_id, max_capacity, requires_confirmation, sort_order,
  is_active, created_at, updated_at
)
SELECT
  id, code, display_name, duration_minutes, color, description,
  brand_id, max_capacity, requires_confirmation, sort_order,
  active, created_at, updated_at
FROM legacy.appointment_event_types;

-- ─── 10. Appointments ────────────────────────────────────────────────────────
-- Renames: ba_user_id→staff_user_id, event_type_id→service_type_id,
-- scheduled_at→start_time, comments→notes, video_link→meeting_url.
-- New: end_time = start_time + duration_minutes; pre_form & service_outcome null.

INSERT INTO appointments (
  id, customer_id, staff_user_id, store_id, service_type_id,
  start_time, end_time, duration_minutes, status, notes,
  reminder_sent_at, confirmation_sent_at, is_virtual, meeting_url,
  rescheduled_from_appointment_id, created_at, updated_at
)
SELECT
  id, customer_id, ba_user_id, store_id, event_type_id,
  scheduled_at,
  scheduled_at + (duration_minutes || ' minutes')::interval,
  duration_minutes, status, comments,
  reminder_sent_at, confirmation_sent_at, is_virtual, video_link,
  rescheduled_from_appointment_id, created_at, updated_at
FROM legacy.appointments;

-- ─── 11. Communications → messages (rename external_id→provider_message_id) ─

INSERT INTO messages (
  id, customer_id, sent_by_user_id, direction, channel, status,
  from_address, to_address, provider_message_id, template_id,
  subject, body, campaign_type, failure_reason,
  sent_at, delivered_at, read_at, responded_at, created_at
)
SELECT
  id, customer_id, sent_by_user_id, direction, channel, status,
  from_address, to_address, external_id, template_id,
  subject, body, followup_type, failure_reason,
  sent_at, delivered_at, read_at, responded_at, created_at
FROM legacy.communications;

INSERT INTO message_templates (
  id, brand_id, name, channel, body, campaign_type, is_active,
  created_at, updated_at
)
SELECT
  id, brand_id, name, channel, body, followup_type, active,
  created_at, updated_at
FROM legacy.message_templates;

-- ─── 12. Notes (was customer_notes, rename private→is_private, author→created_by) ─

INSERT INTO notes (
  id, customer_id, body, product_id, is_private, created_by_user_id,
  created_at, updated_at
)
SELECT
  id, customer_id, body, product_id, private, author_user_id,
  created_at, updated_at
FROM legacy.customer_notes;

-- note_embeddings (was customer_note_embeddings)
INSERT INTO note_embeddings (note_id, embedding, model, generated_at)
SELECT customer_note_id, embedding, model, generated_at
FROM legacy.customer_note_embeddings;

-- ─── 13. Suggested actions (was customer_opportunities) ──────────────────────
-- Renames: ba_user_id→assigned_to_user_id, for_date→due_date,
-- reason→trigger_type, summary→description, suggested_action→recommended_action,
-- acted_at→completed_at.

INSERT INTO suggested_actions (
  id, customer_id, assigned_to_user_id, due_date, trigger_type,
  description, recommended_action, suggested_message_draft,
  priority, dismissed_at, completed_at, created_at
)
SELECT
  id, customer_id, ba_user_id, for_date, reason,
  summary, suggested_action, suggested_message_draft,
  priority, dismissed_at, acted_at, created_at
FROM legacy.customer_opportunities;

-- ─── 14. Orders (was purchases) + line_items (was purchase_items) ────────────
-- New required fields: order_number (generate "L-<short uuid>"), currency='MXN',
-- subtotal_price=total_amount (we don't have breakdown), totals default to 0.

INSERT INTO orders (
  id, order_number, customer_id, store_id, channel, source_name,
  external_order_id, currency, subtotal_price, total_tax,
  total_discounts, total_shipping, total_price,
  financial_status, fulfillment_status,
  attributed_user_id, attribution_source,
  processed_at, created_at, updated_at
)
SELECT
  id,
  'L-' || substr(id::text, 1, 8),
  customer_id, store_id,
  CASE source
    WHEN 'pos_integration' THEN 'in_store'
    WHEN 'ecommerce' THEN 'online'
    WHEN 'manual' THEN 'in_store'
    ELSE 'in_store'
  END,
  source,
  pos_transaction_id, 'MXN', total_amount, 0, 0, 0, total_amount,
  'paid', 'fulfilled',
  attributed_ba_user_id, attribution_reason,
  purchased_at, created_at, updated_at
FROM legacy.purchases;

INSERT INTO line_items (
  id, order_id, product_id, sku, title, variant_title,
  quantity, price, total_discount
)
SELECT
  pi.id, pi.purchase_id, pi.product_id, pi.sku,
  COALESCE(p.name, pi.sku), NULL,
  pi.quantity, pi.unit_price, 0
FROM legacy.purchase_items pi
LEFT JOIN legacy.products p ON p.id = pi.product_id;

-- ─── 15. Recommendations (rename ba_user_id→recommended_by_user_id, ───────────
--                            visit_reason→visit_purpose,
--                            converted_to_purchase→is_converted,
--                            conversion_purchase_id→converted_order_id)

INSERT INTO recommendations (
  id, customer_id, product_id, recommended_by_user_id, store_id,
  recommended_at, source, ai_reasoning, notes, visit_purpose,
  is_converted, converted_order_id, created_at, updated_at
)
SELECT
  id, customer_id, product_id, ba_user_id, store_id,
  recommended_at, source, ai_reasoning, notes, visit_reason,
  converted_to_purchase, conversion_purchase_id, created_at, updated_at
FROM legacy.recommendations;

-- ─── 16. Samples (rename ba_user_id→delivered_by_user_id, similar conversion fields) ─

INSERT INTO samples (
  id, customer_id, product_id, delivered_by_user_id, store_id,
  delivered_at, is_converted, converted_order_id, created_at
)
SELECT
  id, customer_id, product_id, ba_user_id, store_id,
  delivered_at, converted_to_purchase, conversion_purchase_id, created_at
FROM legacy.samples;

-- ─── 17. Consents & audit & AI infra ─────────────────────────────────────────

INSERT INTO consents (
  id, customer_id, type, version, accepted_at, revoked_at, source,
  ip_address, user_agent, signature_url, confirmed_at, created_at
)
SELECT
  id, customer_id, type, version, accepted_at, revoked_at, source,
  ip_address, user_agent, signature_url, confirmed_at, created_at
FROM legacy.consents;

INSERT INTO audit_logs (
  id, actor_user_id, action, entity_type, entity_id, changes,
  ip_address, user_agent, "timestamp"
)
SELECT
  id, actor_user_id, action, entity_type, entity_id, changes,
  ip_address, user_agent, "timestamp"
FROM legacy.audit_logs;

INSERT INTO ai_usage_logs (
  id, user_id, feature, provider, model,
  input_tokens, output_tokens, cached_tokens, latency_ms, cost_usd,
  status, error_code, created_at
)
SELECT
  id, user_id, feature, provider, model,
  input_tokens, output_tokens, cached_tokens, latency_ms, cost_usd,
  status, error_code, created_at
FROM legacy.ai_usage_logs;

INSERT INTO customer_embeddings (customer_id, embedding, model, generated_at)
SELECT customer_id, embedding, model, generated_at
FROM legacy.customer_embeddings;

INSERT INTO customer_ai_summaries (
  customer_id, summary_text, model, prompt_version, generated_at, expires_at
)
SELECT
  customer_id, summary_text, model, prompt_version, generated_at, expires_at
FROM legacy.customer_ai_summaries;

INSERT INTO voice_transcriptions (
  id, customer_id, author_user_id, audio_url, transcript, language,
  provider, model, duration_seconds, created_at
)
SELECT
  id, customer_id, author_user_id, audio_url, transcript, language,
  provider, model, duration_seconds, created_at
FROM legacy.voice_transcriptions;

-- ─── 18. Backfill denormalized aggregates on customers ───────────────────────
-- Now that orders are loaded, recompute total_spent / orders_count / AOV.

UPDATE customers c
SET total_spent = COALESCE(s.total, 0),
    orders_count = COALESCE(s.cnt, 0),
    average_order_value = CASE WHEN COALESCE(s.cnt, 0) > 0
      THEN s.total / s.cnt ELSE 0 END
FROM (
  SELECT customer_id, SUM(total_price) AS total, COUNT(*) AS cnt
  FROM orders
  GROUP BY customer_id
) s
WHERE s.customer_id = c.id;

-- ─── 19. Cleanup FDW resources ──────────────────────────────────────────────

DROP SCHEMA legacy CASCADE;
DROP SERVER legacy_srv CASCADE;

COMMIT;

-- ─── 20. Summary ─────────────────────────────────────────────────────────────

\echo ''
\echo '✓ Data migration complete.'
\echo 'Row counts in new schema:'
SELECT 'municipalities' AS t, COUNT(*) FROM municipalities
UNION ALL SELECT 'zones', COUNT(*) FROM zones
UNION ALL SELECT 'zone_municipalities', COUNT(*) FROM zone_municipalities
UNION ALL SELECT 'brands', COUNT(*) FROM brands
UNION ALL SELECT 'brand_configs', COUNT(*) FROM brand_configs
UNION ALL SELECT 'stores', COUNT(*) FROM stores
UNION ALL SELECT 'brand_stores', COUNT(*) FROM brand_stores
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'beauty_profiles', COUNT(*) FROM beauty_profiles
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'inventory_levels', COUNT(*) FROM inventory_levels
UNION ALL SELECT 'product_embeddings', COUNT(*) FROM product_embeddings
UNION ALL SELECT 'service_types', COUNT(*) FROM service_types
UNION ALL SELECT 'appointments', COUNT(*) FROM appointments
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'line_items', COUNT(*) FROM line_items
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'notes', COUNT(*) FROM notes
UNION ALL SELECT 'suggested_actions', COUNT(*) FROM suggested_actions
UNION ALL SELECT 'recommendations', COUNT(*) FROM recommendations
UNION ALL SELECT 'samples', COUNT(*) FROM samples
UNION ALL SELECT 'consents', COUNT(*) FROM consents
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL SELECT 'ai_usage_logs', COUNT(*) FROM ai_usage_logs
UNION ALL SELECT 'privacy_notices', COUNT(*) FROM privacy_notices
ORDER BY t;
