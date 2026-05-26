-- ─────────────────────────────────────────────────────────────────────────
-- Area Manager demo seed — CDMX Centro zone, Luxe division
--
-- Idempotent (every insert is gated by NOT EXISTS / WHERE NOT EXISTS / unique
-- key conflicts). Safe to re-run.
--
-- Owns 5 stores: Liverpool Centro, Galerías Insurgentes, Mitikah,
-- Parque Delta, Polanco. Polanco already had Juan Perez + 2 BAs; the
-- Python seed-users.py created the 4 missing CMs and 12 BAs.
--
-- This script ONLY writes transactional data:
--   - customers (with realistic enrolment dates, lifecycle, birthdays,
--     marketing consent flags)
--   - orders + line_items (last 35 days, distributed across stores/BAs)
--   - recommendations (~half converted)
--   - samples (~30% converted)
--   - appointments (mix of past/scheduled, status mix)
--   - store_events (5 events, 2 multi-store rollouts sharing event_group_id)
--   - approval_requests (3 pending reservation_long across stores)
-- ─────────────────────────────────────────────────────────────────────────

-- Speed up repeat runs.
SET LOCAL synchronous_commit = off;

-- ── Reference IDs ────────────────────────────────────────────────────────
-- Hard-coded to avoid coupling to seed order. These are real IDs in the DB.

\set zone_centro      '1b02f35d-150f-4026-9002-394f25f5097b'
\set brand_lancome    '47bae5dd-4145-484d-bffc-993f9d58df69'
\set brand_ysl        '5a479367-328c-4dc7-a37c-fd42077a3d0d'

\set store_centro       'b8e15565-0713-49ea-a6c4-cfe2cc12167b'
\set store_insurgentes  '14240ae1-27da-40a0-8e65-604bc3b596be'
\set store_mitikah      '68653ec6-f85d-437b-aed2-76c098eec489'
\set store_delta        '27310a94-81a8-4323-96da-994752075eab'
\set store_polanco      'c4c00ddb-4691-4400-ac6d-10e7b808defd'

\set admin_user 'user_3E2vLXFkwU8VmhfRK3cyyYsJAr7'

-- ── Wipe demo-data tagged with a sentinel order_number prefix on re-runs ─
-- Lets the script be re-run cleanly without nuking historical seed data.

DELETE FROM line_items WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'AMD-%');
DELETE FROM orders WHERE order_number LIKE 'AMD-%';
DELETE FROM samples WHERE customer_id IN (SELECT id FROM customers WHERE email LIKE '%@demo-am.mx');
DELETE FROM recommendations WHERE customer_id IN (SELECT id FROM customers WHERE email LIKE '%@demo-am.mx');
DELETE FROM appointments WHERE customer_id IN (SELECT id FROM customers WHERE email LIKE '%@demo-am.mx');
DELETE FROM event_invitations WHERE store_event_id IN (SELECT id FROM store_events WHERE name LIKE '[AMD]%');
DELETE FROM event_assignments WHERE store_event_id IN (SELECT id FROM store_events WHERE name LIKE '[AMD]%');
DELETE FROM store_events WHERE name LIKE '[AMD]%';
DELETE FROM approval_requests WHERE reason LIKE '[AMD]%';
DELETE FROM customers WHERE email LIKE '%@demo-am.mx';

-- ── Customers ────────────────────────────────────────────────────────────
-- 60 customers, 12 per store. Mix of lifecycle stages, birthdays
-- distributed across the year (some in next 14 days for the birthday
-- bucket), realistic Mexican names + emails + phones.

WITH bas AS (
  SELECT id, store_id FROM users
  WHERE role = 'beauty_advisor'
    AND store_id IN (:'store_centro', :'store_insurgentes', :'store_mitikah', :'store_delta', :'store_polanco')
),
customer_seed AS (
  SELECT * FROM (VALUES
    -- (first, last, gender, store, birthday_offset_from_today_days, lifecycle, days_since_enroll)
    -- Liverpool Centro (Lancôme)
    ('Adriana',  'Castañeda',  'female', :'store_centro',       5,   'vip',       420),
    ('Beatriz',  'Núñez',      'female', :'store_centro',      82,   'returning', 200),
    ('Carolina', 'Reyna',      'female', :'store_centro',     -45,   'returning',  85),
    ('Diana',    'Soto',       'female', :'store_centro',     150,   'new',        22),
    ('Estefanía','Aguirre',    'female', :'store_centro',       2,   'vip',       510),
    ('Fátima',   'Bernal',     'female', :'store_centro',     -90,   'at_risk',   240),
    ('Gabriela', 'Cantú',      'female', :'store_centro',      35,   'returning', 130),
    ('Helena',   'Domínguez',  'female', :'store_centro',     200,   'new',        14),
    ('Inés',     'Esquivel',   'female', :'store_centro',     -10,   'returning', 310),
    ('Jimena',   'Fuentes',    'female', :'store_centro',       9,   'vip',       180),
    ('Karla',    'Guzmán',     'female', :'store_centro',     115,   'at_risk',   195),
    ('Lilia',    'Huerta',     'female', :'store_centro',      48,   'new',        32),

    -- Liverpool Galerías Insurgentes (YSL)
    ('Mariana',  'Iglesias',   'female', :'store_insurgentes',  4,   'vip',       380),
    ('Nicole',   'Juárez',     'female', :'store_insurgentes', 75,   'returning', 145),
    ('Olivia',   'Kuri',       'female', :'store_insurgentes',-30,   'returning', 95),
    ('Paula',    'Lara',       'female', :'store_insurgentes',180,   'new',        18),
    ('Quetzali', 'Maldonado',  'female', :'store_insurgentes', 11,   'vip',       460),
    ('Rebeca',   'Nava',       'female', :'store_insurgentes',-65,   'at_risk',   220),
    ('Silvia',   'Obregón',    'female', :'store_insurgentes', 62,   'returning', 110),
    ('Teresa',   'Palacios',   'female', :'store_insurgentes',-15,   'dormant',   350),
    ('Úrsula',   'Quesada',    'female', :'store_insurgentes',  7,   'vip',       275),
    ('Valeria',  'Ramos',      'female', :'store_insurgentes',125,   'new',        9),
    ('Wendy',    'Sandoval',   'female', :'store_insurgentes',-40,   'returning', 165),
    ('Ximena',   'Tovar',      'female', :'store_insurgentes', 90,   'new',        28),

    -- Liverpool Mitikah (Lancôme)
    ('Yolanda',  'Urías',      'female', :'store_mitikah',       3,  'vip',       400),
    ('Zaira',    'Valencia',   'female', :'store_mitikah',     145,  'returning', 175),
    ('Abril',    'Werner',     'female', :'store_mitikah',     -55,  'at_risk',   215),
    ('Brenda',   'Yáñez',      'female', :'store_mitikah',      28,  'returning', 80),
    ('Cecilia',  'Zermeño',    'female', :'store_mitikah',     165,  'new',        15),
    ('Dolores',  'Almazán',    'female', :'store_mitikah',      10,  'vip',       340),
    ('Eugenia',  'Beltrán',    'female', :'store_mitikah',     -25,  'returning', 120),
    ('Ferrán',   'Carmona',    'male',   :'store_mitikah',     105,  'new',        21),
    ('Graciela', 'De La Torre','female', :'store_mitikah',       6,  'vip',       290),
    ('Hortensia','Espinosa',   'female', :'store_mitikah',     -75,  'at_risk',   260),
    ('Itzel',    'Figueroa',   'female', :'store_mitikah',      55,  'returning', 95),
    ('Julieta',  'Gallardo',   'female', :'store_mitikah',     220,  'new',        7),

    -- Liverpool Parque Delta (YSL)
    ('Karla',    'Henríquez',  'female', :'store_delta',         1,  'vip',       510),
    ('Lourdes',  'Ibarra',     'female', :'store_delta',       155,  'returning', 140),
    ('Magdalena','Jasso',      'female', :'store_delta',       -50,  'at_risk',   190),
    ('Nayeli',   'Kuri',       'female', :'store_delta',        38,  'new',        25),
    ('Octavia',  'Loredo',     'female', :'store_delta',         8,  'vip',       370),
    ('Patricia', 'Mejía',      'female', :'store_delta',       -20,  'returning', 155),
    ('Romina',   'Nieto',      'female', :'store_delta',        72,  'returning', 100),
    ('Susana',   'Olvera',     'female', :'store_delta',       195,  'new',        17),
    ('Tania',    'Padilla',    'female', :'store_delta',        13,  'vip',       320),
    ('Ulrica',   'Quiroz',     'female', :'store_delta',       -85,  'dormant',   305),
    ('Verónica', 'Rocha',      'female', :'store_delta',        47,  'returning', 88),
    ('Wanda',    'Sotelo',     'female', :'store_delta',       130,  'new',        12),

    -- Liverpool Polanco (YSL) — complements the few Polanco customers that already exist
    ('Antonia',  'Trejo',      'female', :'store_polanco',       0,  'vip',       550),
    ('Bárbara',  'Urbina',     'female', :'store_polanco',     170,  'returning', 168),
    ('Constanza','Vidal',      'female', :'store_polanco',     -35,  'at_risk',   210),
    ('Dalia',    'Wong',       'female', :'store_polanco',      65,  'new',        24),
    ('Eloísa',   'Xolalpa',    'female', :'store_polanco',      14,  'vip',       430),
    ('Fabiola',  'Yescas',     'female', :'store_polanco',     -15,  'returning', 102),
    ('Gisela',   'Zamora',     'female', :'store_polanco',     100,  'returning', 75),
    ('Hilda',    'Anaya',      'female', :'store_polanco',     230,  'new',        11),
    ('Irma',     'Becerra',    'female', :'store_polanco',       4,  'vip',       265),
    ('Josefina', 'Cardoso',    'female', :'store_polanco',     -60,  'dormant',   355),
    ('Karina',   'Delgado',    'female', :'store_polanco',      80,  'returning', 60),
    ('Liliana',  'Estrada',    'female', :'store_polanco',     140,  'new',        20)
  ) AS t(first_name, last_name, gender, store_id, birthday_offset_days, lifecycle, days_since_enroll)
)
INSERT INTO customers (
  first_name, last_name, email, phone, gender, birthday,
  preferred_language, preferred_channel,
  accepts_marketing_email, accepts_marketing_sms, accepts_marketing_whatsapp,
  signup_store_id, created_by_user_id, assigned_to_user_id,
  enrolled_at, last_interaction_at, last_order_at,
  total_spent, orders_count, average_order_value,
  loyalty_tier, loyalty_points, lifecycle_stage, is_active
)
SELECT
  cs.first_name,
  cs.last_name,
  -- demo-tagged emails for safe re-runs
  LOWER(cs.first_name) || '.' || REPLACE(LOWER(cs.last_name), ' ', '') || '@demo-am.mx',
  '55' || LPAD((1000000 + (random()*8999999)::int)::text, 7, '0'),
  cs.gender,
  -- Birthday on today + offset, normalized within current year so the
  -- "cumpleaños esta semana" bucket lights up.
  (CURRENT_DATE - INTERVAL '30 years' + (cs.birthday_offset_days || ' days')::interval)::date,
  'es-MX',
  (ARRAY['whatsapp','email','sms','in_person'])[1 + (abs(hashtext(cs.first_name)) % 4)],
  TRUE,
  (abs(hashtext(cs.last_name)) % 2 = 0),
  TRUE,
  cs.store_id::uuid,
  :'admin_user',
  -- Assign each customer to a random BA of the same store.
  (SELECT id FROM bas WHERE bas.store_id::text = cs.store_id ORDER BY random() LIMIT 1),
  NOW() - (cs.days_since_enroll || ' days')::interval,
  -- last_interaction: closer than enrolment for active stages
  CASE cs.lifecycle
    WHEN 'vip'       THEN NOW() - ((1 + abs(hashtext(cs.first_name)) % 8) || ' days')::interval
    WHEN 'returning' THEN NOW() - ((5 + abs(hashtext(cs.first_name)) % 25) || ' days')::interval
    WHEN 'new'       THEN NOW() - ((1 + abs(hashtext(cs.first_name)) % 14) || ' days')::interval
    WHEN 'at_risk'   THEN NOW() - ((90 + abs(hashtext(cs.first_name)) % 60) || ' days')::interval
    WHEN 'dormant'   THEN NOW() - ((180 + abs(hashtext(cs.first_name)) % 90) || ' days')::interval
  END,
  CASE cs.lifecycle
    WHEN 'vip'       THEN NOW() - ((3 + abs(hashtext(cs.first_name)) % 14) || ' days')::interval
    WHEN 'returning' THEN NOW() - ((15 + abs(hashtext(cs.first_name)) % 40) || ' days')::interval
    WHEN 'new'       THEN NOW() - ((1 + abs(hashtext(cs.first_name)) % 25) || ' days')::interval
    WHEN 'at_risk'   THEN NOW() - ((120 + abs(hashtext(cs.first_name)) % 60) || ' days')::interval
    WHEN 'dormant'   THEN NOW() - ((220 + abs(hashtext(cs.first_name)) % 90) || ' days')::interval
  END,
  -- VIP averages ~$45k LTV; returning ~$12k; new ~$2k; at_risk/dormant ~$8k stale
  CASE cs.lifecycle
    WHEN 'vip'       THEN 35000 + (abs(hashtext(cs.last_name)) % 25000)
    WHEN 'returning' THEN 8000  + (abs(hashtext(cs.last_name)) % 10000)
    WHEN 'new'       THEN 1500  + (abs(hashtext(cs.last_name)) % 2500)
    ELSE                  6000  + (abs(hashtext(cs.last_name)) % 6000)
  END,
  CASE cs.lifecycle
    WHEN 'vip'       THEN 8  + (abs(hashtext(cs.first_name)) % 12)
    WHEN 'returning' THEN 3  + (abs(hashtext(cs.first_name)) % 5)
    WHEN 'new'       THEN 1  + (abs(hashtext(cs.first_name)) % 2)
    ELSE                  2  + (abs(hashtext(cs.first_name)) % 3)
  END,
  CASE cs.lifecycle
    WHEN 'vip'       THEN 4500 + (abs(hashtext(cs.last_name)) % 1500)
    WHEN 'returning' THEN 2200 + (abs(hashtext(cs.last_name)) % 800)
    WHEN 'new'       THEN 1500 + (abs(hashtext(cs.last_name)) % 400)
    ELSE                  2000 + (abs(hashtext(cs.last_name)) % 700)
  END,
  CASE cs.lifecycle
    WHEN 'vip'       THEN 'platinum'
    WHEN 'returning' THEN 'gold'
    WHEN 'new'       THEN 'bronze'
    WHEN 'at_risk'   THEN 'silver'
    WHEN 'dormant'   THEN 'bronze'
  END,
  CASE cs.lifecycle
    WHEN 'vip'       THEN 2500 + (abs(hashtext(cs.last_name)) % 1500)
    WHEN 'returning' THEN 800  + (abs(hashtext(cs.last_name)) % 600)
    WHEN 'new'       THEN 50   + (abs(hashtext(cs.last_name)) % 150)
    ELSE                  300  + (abs(hashtext(cs.last_name)) % 400)
  END,
  cs.lifecycle,
  TRUE
FROM customer_seed cs;

-- ── Orders + line items ──────────────────────────────────────────────────
-- ~200 orders distributed in the last 35 days. Each customer gets 0–6
-- orders weighted by lifecycle stage. Amounts mirror the line items below.

WITH bas_per_store AS (
  SELECT store_id::uuid AS store_id, ARRAY_AGG(id) AS ba_ids
  FROM users
  WHERE role = 'beauty_advisor'
    AND store_id IN (:'store_centro', :'store_insurgentes', :'store_mitikah', :'store_delta', :'store_polanco')
  GROUP BY store_id
),
products_per_brand AS (
  SELECT b.id AS brand_id, ARRAY_AGG(p.id) AS product_ids
  FROM products p JOIN brands b ON b.id = p.brand_id
  GROUP BY b.id
),
order_targets AS (
  SELECT
    c.id AS customer_id,
    c.signup_store_id AS store_id,
    c.lifecycle_stage,
    (CASE c.lifecycle_stage
       WHEN 'vip'       THEN 4 + (abs(hashtext(c.id::text)) % 3)
       WHEN 'returning' THEN 2 + (abs(hashtext(c.id::text)) % 2)
       WHEN 'new'       THEN 1
       WHEN 'at_risk'   THEN 1
       WHEN 'dormant'   THEN 0
     END) AS n_orders
  FROM customers c
  WHERE c.email LIKE '%@demo-am.mx'
),
order_rows AS (
  SELECT
    ot.customer_id,
    ot.store_id,
    ot.lifecycle_stage,
    gs.n AS order_idx,
    -- Spread orders within the last 35 days. Deterministic via hash so re-runs are stable.
    NOW() - ((abs(hashtext(ot.customer_id::text || gs.n::text)) % 35) || ' days')::interval
        - ((abs(hashtext(ot.customer_id::text || gs.n::text || 'h')) % 24) || ' hours')::interval AS processed_at,
    -- Brand of the store (Lancôme for Centro/Mitikah, YSL for the rest).
    CASE WHEN ot.store_id::text IN (:'store_centro', :'store_mitikah')
         THEN :'brand_lancome'::uuid ELSE :'brand_ysl'::uuid END AS brand_id
  FROM order_targets ot
  CROSS JOIN LATERAL generate_series(1, ot.n_orders) gs(n)
)
INSERT INTO orders (
  order_number,
  customer_id, store_id,
  channel, source_name,
  currency,
  subtotal_price, total_tax, total_discounts, total_shipping, total_price,
  financial_status, fulfillment_status,
  attributed_user_id, attribution_source,
  processed_at, created_at
)
SELECT
  'AMD-' || LPAD((ROW_NUMBER() OVER (ORDER BY processed_at))::text, 5, '0'),
  customer_id, store_id,
  'in_store', 'pos_integration',
  'MXN',
  -- Subtotal is the line items total; we'll insert line items based on this.
  (CASE lifecycle_stage
     WHEN 'vip'       THEN 4500 + (abs(hashtext(customer_id::text || order_idx::text)) % 6500)
     WHEN 'returning' THEN 2000 + (abs(hashtext(customer_id::text || order_idx::text)) % 2500)
     ELSE                  1200 + (abs(hashtext(customer_id::text || order_idx::text)) % 1500)
   END)::numeric AS subtotal,
  0, 0, 0,
  (CASE lifecycle_stage
     WHEN 'vip'       THEN 4500 + (abs(hashtext(customer_id::text || order_idx::text)) % 6500)
     WHEN 'returning' THEN 2000 + (abs(hashtext(customer_id::text || order_idx::text)) % 2500)
     ELSE                  1200 + (abs(hashtext(customer_id::text || order_idx::text)) % 1500)
   END)::numeric,
  'paid', 'fulfilled',
  -- Random BA of that store.
  (SELECT ba_ids[1 + (abs(hashtext(customer_id::text || order_idx::text)) % array_length(ba_ids, 1))]
   FROM bas_per_store WHERE bas_per_store.store_id = order_rows.store_id),
  'last_consultation',
  processed_at,
  processed_at
FROM order_rows;

-- Insert one line item per order — Lancôme stores get Lancôme products,
-- YSL stores get YSL. We pick by brand mapped to the store.
INSERT INTO line_items (order_id, product_id, sku, title, quantity, price, total_discount)
SELECT
  o.id,
  p.id,
  p.sku,
  p.title,
  1,
  o.subtotal_price,
  0
FROM orders o
JOIN brand_stores bs ON bs.store_id = o.store_id
JOIN products p ON p.brand_id = bs.brand_id
  AND p.id = (
    SELECT p2.id FROM products p2 WHERE p2.brand_id = bs.brand_id
    ORDER BY abs(hashtext(o.id::text || p2.id::text)) LIMIT 1
  )
WHERE o.order_number LIKE 'AMD-%'
  AND bs.brand_id = CASE WHEN o.store_id::text IN (
    :'store_centro', :'store_mitikah'
  ) THEN :'brand_lancome'::uuid ELSE :'brand_ysl'::uuid END;

-- ── Recommendations ─────────────────────────────────────────────────────
-- Generate ~100 recos across customers, ~45% converted.

WITH demo_customers AS (
  SELECT c.id, c.signup_store_id, c.assigned_to_user_id, c.last_interaction_at
  FROM customers c WHERE c.email LIKE '%@demo-am.mx'
),
reco_seed AS (
  SELECT
    dc.id AS customer_id,
    dc.signup_store_id AS store_id,
    dc.assigned_to_user_id AS recommended_by,
    gs.n AS reco_idx
  FROM demo_customers dc
  CROSS JOIN LATERAL generate_series(1, 1 + (abs(hashtext(dc.id::text)) % 3)) gs(n)
)
INSERT INTO recommendations (
  customer_id, product_id, recommended_by_user_id, store_id,
  recommended_at, source, visit_purpose,
  is_converted, notes
)
SELECT
  rs.customer_id,
  (
    SELECT p.id FROM products p
    JOIN brand_stores bs ON bs.brand_id = p.brand_id
    WHERE bs.store_id = rs.store_id
    ORDER BY abs(hashtext(rs.customer_id::text || rs.reco_idx::text || p.id::text)) LIMIT 1
  ),
  rs.recommended_by,
  rs.store_id,
  NOW() - ((abs(hashtext(rs.customer_id::text || rs.reco_idx::text || 'r')) % 35) || ' days')::interval,
  (ARRAY['manual','ai_suggested','next_best_action'])[1 + (abs(hashtext(rs.customer_id::text || rs.reco_idx::text)) % 3)],
  (ARRAY['new_purchase','rebuy','concern','gift'])[1 + (abs(hashtext(rs.customer_id::text || rs.reco_idx::text || 'vp')) % 4)],
  -- 45% conversion rate
  (abs(hashtext(rs.customer_id::text || rs.reco_idx::text || 'c')) % 100 < 45),
  NULL
FROM reco_seed rs
WHERE rs.recommended_by IS NOT NULL;

-- ── Samples ──────────────────────────────────────────────────────────────

WITH demo_customers AS (
  SELECT c.id, c.signup_store_id, c.assigned_to_user_id
  FROM customers c WHERE c.email LIKE '%@demo-am.mx'
),
sample_seed AS (
  SELECT
    dc.id AS customer_id,
    dc.signup_store_id AS store_id,
    dc.assigned_to_user_id AS delivered_by
  FROM demo_customers dc
  WHERE dc.assigned_to_user_id IS NOT NULL
    AND (abs(hashtext(dc.id::text || 's')) % 100) < 60  -- ~60% got a sample
)
INSERT INTO samples (
  customer_id, product_id, delivered_by_user_id, store_id,
  delivered_at, is_converted
)
SELECT
  ss.customer_id,
  (
    SELECT p.id FROM products p
    JOIN brand_stores bs ON bs.brand_id = p.brand_id
    WHERE bs.store_id = ss.store_id
    ORDER BY abs(hashtext(ss.customer_id::text || p.id::text)) LIMIT 1
  ),
  ss.delivered_by,
  ss.store_id,
  NOW() - ((abs(hashtext(ss.customer_id::text || 'sd')) % 30) || ' days')::interval,
  (abs(hashtext(ss.customer_id::text || 'sc')) % 100 < 25)  -- ~25% conversion
FROM sample_seed ss;

-- ── Appointments ─────────────────────────────────────────────────────────
-- 50 appointments distributed across past/future, mix of statuses.

WITH demo_customers AS (
  SELECT c.id, c.signup_store_id, c.assigned_to_user_id
  FROM customers c WHERE c.email LIKE '%@demo-am.mx'
),
appt_seed AS (
  SELECT
    dc.id AS customer_id,
    dc.signup_store_id AS store_id,
    dc.assigned_to_user_id AS staff_user_id,
    1 AS appt_idx
  FROM demo_customers dc
  WHERE dc.assigned_to_user_id IS NOT NULL
    AND (abs(hashtext(dc.id::text || 'a')) % 100) < 75   -- ~75% have appts
),
service_pool AS (
  SELECT ARRAY_AGG(id ORDER BY display_name) AS service_ids FROM service_types
)
INSERT INTO appointments (
  customer_id, staff_user_id, store_id, service_type_id,
  start_time, end_time, duration_minutes,
  status, notes
)
SELECT
  appt_seed.customer_id,
  appt_seed.staff_user_id,
  appt_seed.store_id,
  sp.service_ids[1 + (abs(hashtext(appt_seed.customer_id::text || 'svc')) % array_length(sp.service_ids, 1))],
  -- Distribute: -14 to +21 days from now, anchored to a realistic hour.
  date_trunc('hour', NOW())
    + ((abs(hashtext(appt_seed.customer_id::text || 'dt')) % 35 - 14) || ' days')::interval
    + ((10 + (abs(hashtext(appt_seed.customer_id::text || 'h')) % 8)) || ' hours')::interval,
  date_trunc('hour', NOW())
    + ((abs(hashtext(appt_seed.customer_id::text || 'dt')) % 35 - 14) || ' days')::interval
    + ((10 + (abs(hashtext(appt_seed.customer_id::text || 'h')) % 8)) || ' hours')::interval
    + INTERVAL '45 minutes',
  45,
  -- Status: past → mostly completed, future → scheduled/confirmed
  CASE
    WHEN (abs(hashtext(appt_seed.customer_id::text || 'dt')) % 35 - 14) < 0 THEN
      (ARRAY['completed','completed','completed','no_show','cancelled'])
      [1 + (abs(hashtext(appt_seed.customer_id::text || 'st')) % 5)]
    ELSE
      (ARRAY['scheduled','confirmed','scheduled'])
      [1 + (abs(hashtext(appt_seed.customer_id::text || 'st')) % 3)]
  END,
  NULL
FROM appt_seed CROSS JOIN service_pool sp;

-- ── Store events (5 total, 2 multi-store rollouts) ──────────────────────

DO $$
DECLARE
  group_a uuid := gen_random_uuid();
  group_b uuid := gen_random_uuid();
  centro       uuid := 'b8e15565-0713-49ea-a6c4-cfe2cc12167b';
  insurgentes  uuid := '14240ae1-27da-40a0-8e65-604bc3b596be';
  mitikah      uuid := '68653ec6-f85d-437b-aed2-76c098eec489';
  delta        uuid := '27310a94-81a8-4323-96da-994752075eab';
  polanco      uuid := 'c4c00ddb-4691-4400-ac6d-10e7b808defd';
  brand_lancome uuid := '47bae5dd-4145-484d-bffc-993f9d58df69';
  brand_ysl    uuid := '5a479367-328c-4dc7-a37c-fd42077a3d0d';
BEGIN
  -- Multi-store rollout A: Lanzamiento Lancôme Génifique in Centro+Mitikah+Polanco
  INSERT INTO store_events (store_id, brand_id, event_group_id, name, description, kind, start_time, end_time, capacity, status)
  VALUES
    (centro,  brand_lancome, group_a, '[AMD] Lanzamiento Génifique Ultimate', 'Sesión privada con embajadora de la marca, swatches y consulta gratuita.', 'launch', NOW() + INTERVAL '3 days' + INTERVAL '17 hours', NOW() + INTERVAL '3 days' + INTERVAL '20 hours', 25, 'scheduled'),
    (mitikah, brand_lancome, group_a, '[AMD] Lanzamiento Génifique Ultimate', 'Sesión privada con embajadora de la marca, swatches y consulta gratuita.', 'launch', NOW() + INTERVAL '4 days' + INTERVAL '17 hours', NOW() + INTERVAL '4 days' + INTERVAL '20 hours', 20, 'scheduled'),
    (polanco, brand_lancome, group_a, '[AMD] Lanzamiento Génifique Ultimate', 'Sesión privada con embajadora de la marca, swatches y consulta gratuita.', 'launch', NOW() + INTERVAL '5 days' + INTERVAL '17 hours', NOW() + INTERVAL '5 days' + INTERVAL '20 hours', 30, 'scheduled');

  -- Multi-store rollout B: YSL Libre Masterclass — Insurgentes + Delta
  INSERT INTO store_events (store_id, brand_id, event_group_id, name, description, kind, start_time, end_time, capacity, status)
  VALUES
    (insurgentes, brand_ysl, group_b, '[AMD] Masterclass YSL Libre Berry Crush', 'Masterclass de perfumería con sommelier de fragancias YSL.', 'masterclass', NOW() + INTERVAL '7 days' + INTERVAL '16 hours', NOW() + INTERVAL '7 days' + INTERVAL '18 hours', 15, 'scheduled'),
    (delta,       brand_ysl, group_b, '[AMD] Masterclass YSL Libre Berry Crush', 'Masterclass de perfumería con sommelier de fragancias YSL.', 'masterclass', NOW() + INTERVAL '10 days' + INTERVAL '16 hours', NOW() + INTERVAL '10 days' + INTERVAL '18 hours', 15, 'scheduled');

  -- Solo Lancôme Centro — VIP preview
  INSERT INTO store_events (store_id, brand_id, name, description, kind, start_time, end_time, capacity, status)
  VALUES
    (centro, brand_lancome, '[AMD] VIP Preview · Otoño Lancôme', 'Preview privado para clientas Platinum y Gold de Liverpool Centro.', 'vip_preview', NOW() + INTERVAL '14 days' + INTERVAL '19 hours', NOW() + INTERVAL '14 days' + INTERVAL '21 hours', 12, 'scheduled'),
    -- Solo YSL Mitikah — discovery
    (insurgentes, brand_ysl, '[AMD] Discovery YSL Pure Shots', 'Sesión de descubrimiento de la línea Pure Shots de skincare YSL.', 'discovery', NOW() + INTERVAL '2 days' + INTERVAL '18 hours', NOW() + INTERVAL '2 days' + INTERVAL '20 hours', 10, 'scheduled');
END $$;

-- ── Approval requests pendientes (3) ─────────────────────────────────────

WITH first_ba_per_store AS (
  SELECT DISTINCT ON (store_id) id, store_id::uuid AS store_id, brand_id::uuid AS brand_id
  FROM users
  WHERE role = 'beauty_advisor'
    AND store_id IN (:'store_centro', :'store_insurgentes', :'store_mitikah', :'store_delta')
)
INSERT INTO approval_requests (
  type, status, store_id, brand_id, customer_id, requested_by_user_id,
  reason, payload, expires_at
)
SELECT
  'reservation_long',
  'pending',
  fba.store_id,
  fba.brand_id,
  (SELECT c.id FROM customers c WHERE c.signup_store_id = fba.store_id AND c.email LIKE '%@demo-am.mx' LIMIT 1),
  fba.id,
  '[AMD] Reserva extendida solicitada por la clienta (>7 días) — promoción interna pendiente',
  jsonb_build_object(
    'quantity', 2,
    'holdUntil', (CURRENT_DATE + INTERVAL '14 days')::text,
    'reason', 'La clienta viaja y recogerá en 10 días'
  ),
  NOW() + INTERVAL '7 days'
FROM first_ba_per_store fba
LIMIT 3;

-- ── Verification report ──────────────────────────────────────────────────

DO $$
DECLARE
  am_zone uuid := '1b02f35d-150f-4026-9002-394f25f5097b';
  am_div  uuid := 'c74d7620-94e0-421f-9bf8-2e4d1221805e';
BEGIN
  RAISE NOTICE '--- AREA MANAGER DEMO SEED COMPLETE ---';
  RAISE NOTICE 'Customers (demo-tagged): %', (SELECT COUNT(*) FROM customers WHERE email LIKE '%@demo-am.mx');
  RAISE NOTICE 'Orders (AMD-*):          %', (SELECT COUNT(*) FROM orders WHERE order_number LIKE 'AMD-%');
  RAISE NOTICE 'Recommendations:         %', (SELECT COUNT(*) FROM recommendations r JOIN customers c ON c.id = r.customer_id WHERE c.email LIKE '%@demo-am.mx');
  RAISE NOTICE 'Samples:                 %', (SELECT COUNT(*) FROM samples s JOIN customers c ON c.id = s.customer_id WHERE c.email LIKE '%@demo-am.mx');
  RAISE NOTICE 'Appointments:            %', (SELECT COUNT(*) FROM appointments a JOIN customers c ON c.id = a.customer_id WHERE c.email LIKE '%@demo-am.mx');
  RAISE NOTICE 'Store events ([AMD]):    %', (SELECT COUNT(*) FROM store_events WHERE name LIKE '[AMD]%');
  RAISE NOTICE 'Approvals ([AMD]):       %', (SELECT COUNT(*) FROM approval_requests WHERE reason LIKE '[AMD]%');
END $$;
