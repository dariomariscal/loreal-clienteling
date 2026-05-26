-- ─────────────────────────────────────────────────────────────────────────
-- National Retail Manager (NRM) demo seed — Luxe division, 5 new zones
--
-- Idempotent: cleans + reinserts demo rows tagged with sentinels.
--   - customers:  email ends with @demo-nrm.mx
--   - orders:     order_number starts with 'NRD-'
--   - templates:  name starts with '[NRM]'
--   - segments:   name starts with '[NRM]'
--
-- Covers 8 real Liverpool stores in 5 zones (Norte, Sureste, Bajío,
-- Noroeste, EdoMex Valle de México), wired to 37 Clerk-created users
-- (5 AMs + 8 CMs + 24 BAs). The NRM (d.nacional@loreal.mx) sees all of
-- this because his scope is divisionId=Luxe.
-- ─────────────────────────────────────────────────────────────────────────

SET LOCAL synchronous_commit = off;

-- ── Reference IDs (real DB values) ───────────────────────────────────────

\set division_luxe 'c74d7620-94e0-421f-9bf8-2e4d1221805e'
\set brand_lancome '47bae5dd-4145-484d-bffc-993f9d58df69'
\set brand_ysl     '5a479367-328c-4dc7-a37c-fd42077a3d0d'
\set zone_norte     '77d873e6-1c23-47b4-8b9e-f4ab840262f7'
\set zone_sureste   'a331de3f-95b5-4eed-9588-1f28f9037533'
\set zone_bajio     '3040890d-1c3e-4a82-a1f7-27b68963f16a'
\set zone_noroeste  'fba0c25e-58f6-47aa-8958-cc071663f8cc'
\set zone_edomex    '2e381b36-6760-40d6-9253-b1556affbb07'
\set store_torreon    'f96fe584-5308-40f8-8a5a-e0dc588f0ec0'
\set store_saltillo   'b81d5684-dfc4-4773-a85b-7c77632e8b7f'
\set store_tuxtla     'a90b339f-9a3d-462f-8d42-4ea3904f7cb3'
\set store_campeche   '01669762-1dfa-410a-ac9a-c9ed3142c773'
\set store_ags        '4692f67e-6809-4e24-84f8-bd64e73094c4'
\set store_tijuana    '4db888d7-fe9e-4486-9d28-9a4783d9125e'
\set store_toreo      'e70804a7-28c1-4d62-87eb-d4b033f5de8e'
\set store_interlomas 'd35ed4fe-bb06-4d21-9ba9-c59a642f669e'
\set p_lc_lavie     '198dc8ae-a09e-445e-8285-7513d09db2ef'
\set p_lc_idole_fr  'd08caba8-81b9-4e24-af5e-934277045f92'
\set p_lc_lash      '388b23db-c520-4e60-a84f-57c72cc771e3'
\set p_lc_tiu       '95d755a0-1d15-40ae-90bb-87fd8271b4d3'
\set p_lc_genif     '6230961c-488a-4151-826b-a879b6f9319a'
\set p_ysl_libre    '2ed4fc15-5b26-438a-9ff3-fb4ab4fdd3fb'
\set p_ysl_ff       'cfd66d72-89e8-4f6a-a1c1-cccd0839eda0'
\set p_ysl_berry    'df16f5ba-4269-4e83-86bd-01da9fb06d56'
\set p_ysl_blush    'f02a4247-90eb-4dca-ae94-2925271eee9f'
\set p_ysl_psp      'e41dc166-39a9-4f03-aab5-f364daf3599a'
\set p_ysl_nr       '9bbd0e11-2332-47d0-b0c9-347a4931100a'

-- Users (real Clerk IDs from /tmp/nrm-users.json)
\set u_admin 'user_3E2vLXFkwU8VmhfRK3cyyYsJAr7'
\set cm_torreon    'user_3EHLA7qRLmQtdXPTeYB2IcnQKrS'
\set cm_saltillo   'user_3EHLT5VylvMlEEirMm048EoVs3L'
\set cm_tuxtla     'user_3EHLALyo0WkqVfAonxGRHkyaypd'
\set cm_campeche   'user_3EHLAU92n6dHBC4htZKZh4hK2MD'
\set cm_ags        'user_3EHLAbmvDKV0b2mJ2wA0mn5qdzL'
\set cm_tijuana    'user_3EHLAd92yMcO4DMqNl2I8wJYftj'
\set cm_toreo      'user_3EHLAgBKZJiyDzPOrg3CeN4bc2F'
\set cm_interlomas 'user_3EHLFUEhxUPXVot2OGYgHDqzezz'

-- Beauty Advisors (3 per store)
\set ba_torreon_1    'user_3EHLAsq4H8vmQVV2Mf92Cw5DaXN'
\set ba_torreon_2    'user_3EHLB2gWsl0irFf8Vx00my41jNs'
\set ba_torreon_3    'user_3EHLBB1A79xQE8tJiRAb1W6B74k'
\set ba_saltillo_1   'user_3EHLbN039fgth50OxfK8T3S9fLl'
\set ba_saltillo_2   'user_3EHLBGLfwjTIste0sIrisBMR6ae'
\set ba_saltillo_3   'user_3EHLBMaZbfPS73CWdJy0q19xkmc'
\set ba_tuxtla_1     'user_3EHTz6fEGqZWQ6xGxmgHFqtoFid'
\set ba_tuxtla_2     'user_3EHLBRWleUefZ46bSuH9VbhIQVK'
\set ba_tuxtla_3     'user_3EHLhXOnuoRaHRF9FuH9MVDyqd3'
\set ba_campeche_1   'user_3EHLBo7zwoXREK6ERlG4e5k5Wwz'
\set ba_campeche_2   'user_3EHLBghxL1mQuXEvO87fQWfM8zx'
\set ba_campeche_3   'user_3EHLjnekdBRBGNH7dKG2QFuouda'
\set ba_ags_1        'user_3EHLBzz8EttMlRZTGBPKcIO2sCo'
\set ba_ags_2        'user_3EHLC3dJ49NkNDP3aMdpImPawxm'
\set ba_ags_3        'user_3EHLC5wADPiqTdD4uJ6FCHUb2R6'
\set ba_tijuana_1    'user_3EHLGLjJdkyOk8d3iYr4XPmP19f'
\set ba_tijuana_2    'user_3EHLCHnUoOfTDpRgaUcpunAlfDT'
\set ba_tijuana_3    'user_3EHLGaNX619QupDGndmx91mY282'
\set ba_toreo_1      'user_3EHLCT2LGocFXSwVbfV8enVHZB2'
\set ba_toreo_2      'user_3EHLCRUuGp4xw5Vtgt4LG5BbVfC'
\set ba_toreo_3      'user_3EHLCcsQwJvzCAFfOiGqB0DU5NF'
\set ba_interlomas_1 'user_3EHLsy5nA6L1mKgolBa0MFNS8Nx'
\set ba_interlomas_2 'user_3EHLCniiJ4vBeVFSQLI6n1Dp2wq'
\set ba_interlomas_3 'user_3EHLGqSrrOzQrtiEdEEPgUS8CHx'

-- NRM (for created_by on templates / segments)
\set nrm_user 'user_3EHK648dCHOuto49mYNqJdzA6XS'

-- ── Wipe demo data on re-run ─────────────────────────────────────────────

DELETE FROM line_items WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'NRD-%');
DELETE FROM orders WHERE order_number LIKE 'NRD-%';
DELETE FROM samples WHERE customer_id IN (SELECT id FROM customers WHERE email LIKE '%@demo-nrm.mx');
DELETE FROM recommendations WHERE customer_id IN (SELECT id FROM customers WHERE email LIKE '%@demo-nrm.mx');
DELETE FROM customers WHERE email LIKE '%@demo-nrm.mx';
DELETE FROM message_templates WHERE name LIKE '[NRM]%';
DELETE FROM customer_segments WHERE name LIKE '[NRM]%';


-- ── Customers ────────────────────────────────────────────────────────────
-- 160 customers, 20 per store. Realistic Mexican names, lifecycle mix.
-- Each row hand-shaped via VALUES so we control which CM/BA created.

INSERT INTO customers (
  first_name, last_name, email, phone, gender, birthday,
  preferred_language, preferred_channel,
  accepts_marketing_email, accepts_marketing_sms, accepts_marketing_whatsapp,
  signup_store_id, created_by_user_id, assigned_to_user_id,
  enrolled_at, last_interaction_at, last_order_at,
  total_spent, orders_count, average_order_value,
  loyalty_tier, loyalty_points, lifecycle_stage
)
SELECT
  v.first_name, v.last_name,
  v.first_name || '.' || v.last_name || ROW_NUMBER() OVER () || '@demo-nrm.mx',
  '+5255' || LPAD((9100000 + ROW_NUMBER() OVER ())::text, 7, '0'),
  v.gender,
  v.birthday::date,
  'es-MX',
  v.channel,
  v.opt_email, v.opt_sms, v.opt_whatsapp,
  v.store_id::uuid,
  v.created_by,
  v.assigned_to,
  NOW() - (v.enrolled_days_ago || ' days')::interval,
  NOW() - (v.last_interact_days || ' days')::interval,
  CASE WHEN v.orders > 0 THEN NOW() - (v.last_order_days || ' days')::interval ELSE NULL END,
  v.total_spent, v.orders, v.aov,
  v.loyalty_tier, v.loyalty_points, v.lifecycle
FROM (VALUES
  -- ── Torreon (MX-NORTE) 20 customers ───────────────────────────────────
  ('Lucia',    'Mendez',     'F', '1988-03-14', 'whatsapp', true,  true,  true,  :'store_torreon', :'cm_torreon',     :'ba_torreon_1',    180, 5,   12,  18500, 4, 4625,  'gold',     2200, 'vip'),
  ('Andrea',   'Gutierrez',  'F', '1992-07-22', 'email',    true,  false, true,  :'store_torreon', :'ba_torreon_1',    :'ba_torreon_1',   140, 12,  35,   9800, 3, 3267,  'silver',   1400, 'active'),
  ('Marcela',  'Olvera',     'F', '1985-11-03', 'whatsapp', false, true,  true,  :'store_torreon', :'ba_torreon_2',    :'ba_torreon_2',   90,  20,  60,   4200, 1, 4200,  NULL,        450, 'at_risk'),
  ('Sofia',    'Martin',     'F', '1995-01-30', 'email',    true,  true,  false, :'store_torreon', :'ba_torreon_2',    :'ba_torreon_2',   220, 8,   25,  21300, 6, 3550,  'gold',     2900, 'vip'),
  ('Adriana',  'Cabello',    'F', '1979-05-18', 'whatsapp', false, false, true,  :'store_torreon', :'ba_torreon_3',    :'ba_torreon_3',   60,  3,   8,    6200, 2, 3100,  'silver',    800, 'active'),
  ('Valeria',  'Iniesta',    'F', '1990-09-09', 'sms',      false, true,  false, :'store_torreon', :'ba_torreon_3',    :'ba_torreon_3',   45,  18,  40,   2870, 1, 2870,  NULL,        300, 'new'),
  ('Roxana',   'Camargo',    'F', '1983-12-12', 'whatsapp', true,  true,  true,  :'store_torreon', :'cm_torreon',     :'ba_torreon_1',    280, 25,  70,  14600, 4, 3650,  'silver',   1700, 'at_risk'),
  ('Yuliana',  'Rendon',     'F', '1996-06-25', 'email',    true,  false, true,  :'store_torreon', :'ba_torreon_1',    :'ba_torreon_1',   30,  2,   5,    3800, 1, 3800,  NULL,        400, 'new'),
  ('Brenda',   'Velasco',    'F', '1987-02-08', 'whatsapp', false, true,  true,  :'store_torreon', :'ba_torreon_2',    :'ba_torreon_2',   165, 10,  28,  16200, 5, 3240,  'gold',     1900, 'active'),
  ('Daniela',  'Carmona',    'F', '1991-08-16', 'email',    true,  true,  false, :'store_torreon', :'ba_torreon_3',    :'ba_torreon_3',   100, 4,   18,   7600, 2, 3800,  'silver',    900, 'active'),
  ('Esperanza','Anaya',      'F', '1975-04-22', 'whatsapp', true,  false, true,  :'store_torreon', :'cm_torreon',     :'cm_torreon',     320, 35,  90,  22000, 7, 3143,  'gold',     3000, 'at_risk'),
  ('Fernanda', 'Cano',       'F', '1993-10-30', 'email',    true,  true,  true,  :'store_torreon', :'ba_torreon_1',    :'ba_torreon_1',   75,  6,   15,   5100, 1, 5100,  'silver',    600, 'active'),
  ('Itzel',    'Robledo',    'F', '1989-11-11', 'whatsapp', false, true,  true,  :'store_torreon', :'ba_torreon_2',    :'ba_torreon_2',   125, 14,  30,  10200, 3, 3400,  'silver',   1100, 'active'),
  ('Karen',    'Solis',      'F', '1986-07-04', 'sms',      false, true,  false, :'store_torreon', :'ba_torreon_3',    :'ba_torreon_3',   200, 22,  50,   9800, 3, 3267,  NULL,       1000, 'at_risk'),
  ('Laura',    'Tinoco',     'F', '1994-12-15', 'email',    true,  false, true,  :'store_torreon', :'ba_torreon_1',    :'ba_torreon_1',   50,  9,   14,   4020, 1, 4020,  NULL,        400, 'new'),
  ('Mariela',  'Vergara',    'F', '1982-01-19', 'whatsapp', true,  true,  true,  :'store_torreon', :'cm_torreon',     :'ba_torreon_2',    240, 16,  45,  19800, 5, 3960,  'gold',     2300, 'active'),
  ('Nadia',    'Yepez',      'F', '1997-03-27', 'email',    true,  true,  false, :'store_torreon', :'ba_torreon_2',    :'ba_torreon_2',   20,  1,   3,    2870, 1, 2870,  NULL,        300, 'new'),
  ('Olga',     'Romo',       'F', '1980-08-06', 'whatsapp', false, true,  true,  :'store_torreon', :'ba_torreon_3',    :'ba_torreon_3',   190, 11,  32,  13400, 4, 3350,  'silver',   1500, 'active'),
  ('Patricia', 'Salgado',    'F', '1988-09-12', 'whatsapp', true,  false, true,  :'store_torreon', :'ba_torreon_1',    :'ba_torreon_1',   110, 7,   22,   8600, 2, 4300,  'silver',    950, 'active'),
  ('Renata',   'Treviño',    'F', '1992-02-28', 'email',    true,  true,  true,  :'store_torreon', :'ba_torreon_2',    :'ba_torreon_2',   40,  4,   10,   3050, 1, 3050,  NULL,        350, 'new'),

  -- ── Saltillo (MX-NORTE) 20 customers ──────────────────────────────────
  ('Alma',     'Banuelos',   'F', '1984-06-11', 'whatsapp', true,  true,  true,  :'store_saltillo', :'cm_saltillo',    :'ba_saltillo_1', 200, 8,   22,  17400, 5, 3480,  'gold',     2000, 'vip'),
  ('Beatriz',  'Cisneros',   'F', '1991-12-05', 'email',    true,  false, true,  :'store_saltillo', :'ba_saltillo_1', :'ba_saltillo_1', 130, 15,  40,   8200, 2, 4100,  'silver',   1000, 'active'),
  ('Cecilia',  'Fonseca',    'F', '1987-04-17', 'whatsapp', false, true,  true,  :'store_saltillo', :'ba_saltillo_2', :'ba_saltillo_2', 95,  18,  55,   5400, 1, 5400,  'silver',    700, 'at_risk'),
  ('Dolores',  'Galindo',    'F', '1978-09-29', 'whatsapp', true,  true,  true,  :'store_saltillo', :'cm_saltillo',    :'cm_saltillo',  270, 28,  80,  19200, 6, 3200,  'gold',     2500, 'at_risk'),
  ('Estela',   'Huerta',     'F', '1995-03-13', 'email',    true,  true,  false, :'store_saltillo', :'ba_saltillo_2', :'ba_saltillo_2', 55,  11,  20,   4020, 1, 4020,  NULL,        450, 'new'),
  ('Genoveva', 'Lara',       'F', '1981-07-21', 'whatsapp', false, true,  true,  :'store_saltillo', :'ba_saltillo_3', :'ba_saltillo_3', 175, 9,   30,  12800, 4, 3200,  'silver',   1500, 'active'),
  ('Hortensia','Mata',       'F', '1973-11-25', 'sms',      false, true,  false, :'store_saltillo', :'cm_saltillo',    :'ba_saltillo_1', 300, 40,  95,  16700, 5, 3340,  'silver',   1900, 'at_risk'),
  ('Ivana',    'Nieves',     'F', '1993-05-08', 'email',    true,  false, true,  :'store_saltillo', :'ba_saltillo_1', :'ba_saltillo_1', 35,  3,   8,    2870, 1, 2870,  NULL,        300, 'new'),
  ('Julieta',  'Pacheco',    'F', '1989-08-14', 'whatsapp', true,  true,  true,  :'store_saltillo', :'ba_saltillo_2', :'ba_saltillo_2', 155, 12,  35,  10980, 3, 3660,  'silver',   1300, 'active'),
  ('Lourdes',  'Quezada',    'F', '1986-10-30', 'whatsapp', true,  true,  false, :'store_saltillo', :'ba_saltillo_3', :'ba_saltillo_3', 105, 5,   17,   7100, 2, 3550,  'silver',    800, 'active'),
  ('Margarita','Rosales',    'F', '1977-02-14', 'whatsapp', false, true,  true,  :'store_saltillo', :'cm_saltillo',    :'ba_saltillo_1', 250, 30,  75,  20500, 6, 3417,  'gold',     2400, 'at_risk'),
  ('Norma',    'Salinas',    'F', '1994-06-19', 'email',    true,  true,  true,  :'store_saltillo', :'ba_saltillo_1', :'ba_saltillo_1', 65,  7,   15,   4290, 1, 4290,  NULL,        500, 'new'),
  ('Ofelia',   'Tellez',     'F', '1985-09-26', 'whatsapp', false, true,  true,  :'store_saltillo', :'ba_saltillo_2', :'ba_saltillo_2', 140, 13,  38,   9800, 3, 3267,  'silver',   1100, 'active'),
  ('Pamela',   'Urias',      'F', '1990-12-04', 'sms',      false, true,  false, :'store_saltillo', :'ba_saltillo_3', :'ba_saltillo_3', 215, 19,  50,   8600, 3, 2867,  NULL,        950, 'at_risk'),
  ('Quetzali', 'Vanegas',    'F', '1996-04-09', 'email',    true,  false, true,  :'store_saltillo', :'ba_saltillo_1', :'ba_saltillo_1', 25,  2,   6,    2870, 1, 2870,  NULL,        300, 'new'),
  ('Rosalinda','Wong',       'F', '1983-01-23', 'whatsapp', true,  true,  true,  :'store_saltillo', :'cm_saltillo',    :'cm_saltillo',  235, 17,  48,  18200, 5, 3640,  'gold',     2100, 'active'),
  ('Selene',   'Yanes',      'F', '1992-08-31', 'email',    true,  true,  false, :'store_saltillo', :'ba_saltillo_2', :'ba_saltillo_2', 80,  6,   18,   5740, 2, 2870,  'silver',    650, 'active'),
  ('Tania',    'Zaragoza',   'F', '1979-05-15', 'whatsapp', false, true,  true,  :'store_saltillo', :'ba_saltillo_3', :'ba_saltillo_3', 185, 10,  29,  13200, 4, 3300,  'silver',   1500, 'active'),
  ('Ursula',   'Almanza',    'F', '1988-11-07', 'whatsapp', true,  false, true,  :'store_saltillo', :'ba_saltillo_1', :'ba_saltillo_1', 115, 8,   25,   7400, 2, 3700,  'silver',    850, 'active'),
  ('Valentina','Borrego',    'F', '1991-03-21', 'email',    true,  true,  true,  :'store_saltillo', :'ba_saltillo_2', :'ba_saltillo_2', 45,  5,   11,   3050, 1, 3050,  NULL,        350, 'new'),

  -- ── Tuxtla (MX-SURESTE) 20 customers ──────────────────────────────────
  ('Andrea',   'Cabrera',    'F', '1986-05-22', 'whatsapp', true,  true,  true,  :'store_tuxtla', :'cm_tuxtla',     :'ba_tuxtla_1',     190, 9,  24,   16800, 5, 3360, 'gold',     1950, 'vip'),
  ('Bianca',   'Diaz',       'F', '1993-09-08', 'email',    true,  false, true,  :'store_tuxtla', :'ba_tuxtla_1',  :'ba_tuxtla_1',     150, 14, 38,    9300, 3, 3100, 'silver',   1100, 'active'),
  ('Camila',   'Estrada',    'F', '1989-02-16', 'whatsapp', false, true,  true,  :'store_tuxtla', :'ba_tuxtla_2',  :'ba_tuxtla_2',     105, 19, 52,    5740, 2, 2870, 'silver',    650, 'at_risk'),
  ('Dulce',    'Figueroa',   'F', '1995-07-04', 'email',    true,  true,  false, :'store_tuxtla', :'ba_tuxtla_2',  :'ba_tuxtla_2',      65, 11, 22,    4020, 1, 4020,  NULL,        450, 'new'),
  ('Edith',    'Galvan',     'F', '1980-10-12', 'whatsapp', true,  false, true,  :'store_tuxtla', :'cm_tuxtla',     :'ba_tuxtla_3',     230, 21, 60,   18600, 6, 3100, 'gold',     2200, 'active'),
  ('Fatima',   'Heredia',    'F', '1992-12-28', 'whatsapp', false, true,  true,  :'store_tuxtla', :'ba_tuxtla_3',  :'ba_tuxtla_3',     115, 7,  19,    7600, 2, 3800, 'silver',    850, 'active'),
  ('Gloria',   'Inurreta',   'F', '1976-03-09', 'sms',      false, true,  false, :'store_tuxtla', :'cm_tuxtla',     :'cm_tuxtla',       290, 33, 85,   17200, 5, 3440, 'silver',   1900, 'at_risk'),
  ('Hilda',    'Jasso',      'F', '1994-08-17', 'email',    true,  true,  true,  :'store_tuxtla', :'ba_tuxtla_1',  :'ba_tuxtla_1',      30,  4, 10,    3050, 1, 3050,  NULL,        350, 'new'),
  ('Isadora',  'Loaiza',     'F', '1988-04-25', 'whatsapp', true,  true,  true,  :'store_tuxtla', :'ba_tuxtla_2',  :'ba_tuxtla_2',     165, 13, 36,   11200, 3, 3733, 'silver',   1300, 'active'),
  ('Jimena',   'Manzo',      'F', '1985-11-19', 'email',    true,  true,  false, :'store_tuxtla', :'ba_tuxtla_3',  :'ba_tuxtla_3',     125, 6,  20,    8200, 2, 4100, 'silver',    900, 'active'),
  ('Karla',    'Nieblas',    'F', '1972-06-02', 'whatsapp', true,  true,  true,  :'store_tuxtla', :'cm_tuxtla',     :'ba_tuxtla_1',     310, 36, 88,   23400, 7, 3343, 'gold',     2700, 'at_risk'),
  ('Liliana',  'Otero',      'F', '1996-01-30', 'email',    true,  false, true,  :'store_tuxtla', :'ba_tuxtla_1',  :'ba_tuxtla_1',      50,  8, 14,    4020, 1, 4020,  NULL,        450, 'new'),
  ('Maite',    'Penaloza',   'F', '1990-09-13', 'whatsapp', false, true,  true,  :'store_tuxtla', :'ba_tuxtla_2',  :'ba_tuxtla_2',     145, 16, 42,    9540, 3, 3180, 'silver',   1100, 'active'),
  ('Nayeli',   'Quiroz',     'F', '1987-07-08', 'sms',      false, true,  false, :'store_tuxtla', :'ba_tuxtla_3',  :'ba_tuxtla_3',     220, 24, 65,   10900, 3, 3633,  NULL,       1200, 'at_risk'),
  ('Olivia',   'Reynoso',    'F', '1997-02-21', 'email',    true,  false, true,  :'store_tuxtla', :'ba_tuxtla_1',  :'ba_tuxtla_1',      20,  2,  5,    2870, 1, 2870,  NULL,        300, 'new'),
  ('Paloma',   'Sanjuan',    'F', '1984-04-06', 'whatsapp', true,  true,  true,  :'store_tuxtla', :'cm_tuxtla',     :'cm_tuxtla',       245, 18, 49,   19400, 5, 3880, 'gold',     2300, 'active'),
  ('Quetzalli','Toral',      'F', '1991-10-24', 'email',    true,  true,  false, :'store_tuxtla', :'ba_tuxtla_2',  :'ba_tuxtla_2',      90,  7, 21,    5740, 2, 2870, 'silver',    650, 'active'),
  ('Regina',   'Uribe',      'F', '1989-12-17', 'whatsapp', false, true,  true,  :'store_tuxtla', :'ba_tuxtla_3',  :'ba_tuxtla_3',     175, 11, 33,   12600, 4, 3150, 'silver',   1450, 'active'),
  ('Sandra',   'Villasana',  'F', '1986-08-09', 'whatsapp', true,  false, true,  :'store_tuxtla', :'ba_tuxtla_1',  :'ba_tuxtla_1',     120,  5, 16,    7100, 2, 3550, 'silver',    800, 'active'),
  ('Teresa',   'Yera',       'F', '1993-06-26', 'email',    true,  true,  true,  :'store_tuxtla', :'ba_tuxtla_2',  :'ba_tuxtla_2',      40,  3,  9,    3050, 1, 3050,  NULL,        350, 'new'),

  -- ── Campeche (MX-SURESTE) 20 customers ────────────────────────────────
  ('Alejandra','Bermudez',   'F', '1982-04-15', 'whatsapp', true,  true,  true,  :'store_campeche', :'cm_campeche',  :'ba_campeche_1', 195, 7,  21,  16100, 5, 3220, 'gold',     1850, 'vip'),
  ('Brenda',   'Coronado',   'F', '1990-10-28', 'email',    true,  false, true,  :'store_campeche', :'ba_campeche_1',:'ba_campeche_1', 135, 13, 36,   8400, 2, 4200, 'silver',    950, 'active'),
  ('Carolina', 'Duenas',     'F', '1987-07-11', 'whatsapp', false, true,  true,  :'store_campeche', :'ba_campeche_2',:'ba_campeche_2',  95, 17, 48,   5200, 1, 5200, 'silver',    600, 'at_risk'),
  ('Diana',    'Espino',     'F', '1995-12-03', 'email',    true,  true,  false, :'store_campeche', :'ba_campeche_2',:'ba_campeche_2',  55, 10, 19,   4020, 1, 4020,  NULL,        450, 'new'),
  ('Emma',     'Franco',     'F', '1978-08-19', 'whatsapp', true,  false, true,  :'store_campeche', :'cm_campeche',  :'cm_campeche',   265, 25, 70,  21800, 6, 3633, 'gold',     2500, 'vip'),
  ('Fabiola',  'Granados',   'F', '1991-11-05', 'whatsapp', false, true,  true,  :'store_campeche', :'ba_campeche_3',:'ba_campeche_3', 115, 8,  23,   7600, 2, 3800, 'silver',    850, 'active'),
  ('Gabriela', 'Hidalgo',    'F', '1974-05-22', 'sms',      false, true,  false, :'store_campeche', :'cm_campeche',  :'ba_campeche_1', 300, 38, 92,  17400, 5, 3480, 'silver',   1950, 'at_risk'),
  ('Helena',   'Iturbide',   'F', '1993-02-14', 'email',    true,  true,  true,  :'store_campeche', :'ba_campeche_1',:'ba_campeche_1',  35,  3,  9,   2870, 1, 2870,  NULL,        300, 'new'),
  ('Idalia',   'Juarez',     'F', '1988-09-30', 'whatsapp', true,  true,  true,  :'store_campeche', :'ba_campeche_2',:'ba_campeche_2', 170, 14, 40,  10980, 3, 3660, 'silver',   1250, 'active'),
  ('Jessica',  'Kuri',       'F', '1985-06-08', 'email',    true,  true,  false, :'store_campeche', :'ba_campeche_3',:'ba_campeche_3', 120, 5,  17,   8200, 2, 4100, 'silver',    900, 'active'),
  ('Karina',   'Laureano',   'F', '1973-01-26', 'whatsapp', true,  true,  true,  :'store_campeche', :'cm_campeche',  :'cm_campeche',   325, 41, 96,  22600, 7, 3229, 'gold',     2600, 'at_risk'),
  ('Lourdes',  'Macedo',     'F', '1996-04-12', 'email',    true,  false, true,  :'store_campeche', :'ba_campeche_1',:'ba_campeche_1',  45,  6, 13,   4020, 1, 4020,  NULL,        450, 'new'),
  ('Maria',    'Naranjo',    'F', '1989-08-25', 'whatsapp', false, true,  true,  :'store_campeche', :'ba_campeche_2',:'ba_campeche_2', 155, 15, 41,   9540, 3, 3180, 'silver',   1100, 'active'),
  ('Natalia',  'Ojeda',      'F', '1986-11-14', 'sms',      false, true,  false, :'store_campeche', :'ba_campeche_3',:'ba_campeche_3', 210, 23, 62,  10800, 3, 3600,  NULL,       1200, 'at_risk'),
  ('Olga',     'Patino',     'F', '1997-07-02', 'email',    true,  false, true,  :'store_campeche', :'ba_campeche_1',:'ba_campeche_1',  25,  2,  6,   2870, 1, 2870,  NULL,        300, 'new'),
  ('Priscila', 'Quintanilla','F', '1981-03-18', 'whatsapp', true,  true,  true,  :'store_campeche', :'cm_campeche',  :'cm_campeche',   240, 19, 51,  18600, 5, 3720, 'gold',     2200, 'active'),
  ('Raquel',   'Rico',       'F', '1992-09-07', 'email',    true,  true,  false, :'store_campeche', :'ba_campeche_2',:'ba_campeche_2',  85,  8, 22,   5740, 2, 2870, 'silver',    650, 'active'),
  ('Sara',     'Solorzano',  'F', '1988-12-21', 'whatsapp', false, true,  true,  :'store_campeche', :'ba_campeche_3',:'ba_campeche_3', 180, 12, 34,  12200, 4, 3050, 'silver',   1400, 'active'),
  ('Teresa',   'Tagle',      'F', '1985-10-29', 'whatsapp', true,  false, true,  :'store_campeche', :'ba_campeche_1',:'ba_campeche_1', 110,  4, 15,   7100, 2, 3550, 'silver',    800, 'active'),
  ('Valeria',  'Uranga',     'F', '1990-05-04', 'email',    true,  true,  true,  :'store_campeche', :'ba_campeche_2',:'ba_campeche_2',  50,  4, 11,   3050, 1, 3050,  NULL,        350, 'new'),

  -- ── Aguascalientes (MX-BAJIO) 20 customers ────────────────────────────
  ('Adriana',  'Casillas',   'F', '1985-06-18', 'whatsapp', true,  true,  true,  :'store_ags', :'cm_ags',  :'ba_ags_1', 205, 9,  25,  16400, 5, 3280, 'gold',     1900, 'vip'),
  ('Beatriz',  'Delarosa',   'F', '1992-01-09', 'email',    true,  false, true,  :'store_ags', :'ba_ags_1',:'ba_ags_1', 145, 16, 42,   9000, 3, 3000, 'silver',   1050, 'active'),
  ('Catalina', 'Esparza',    'F', '1988-08-23', 'whatsapp', false, true,  true,  :'store_ags', :'ba_ags_2',:'ba_ags_2', 100, 20, 56,   5400, 1, 5400, 'silver',    600, 'at_risk'),
  ('Doris',    'Fierro',     'F', '1994-05-14', 'email',    true,  true,  false, :'store_ags', :'ba_ags_2',:'ba_ags_2',  60,  9, 17,   3700, 1, 3700,  NULL,        400, 'new'),
  ('Esmeralda','Guevara',    'F', '1979-12-07', 'whatsapp', true,  false, true,  :'store_ags', :'cm_ags',  :'cm_ags',   270, 22, 65,  19800, 6, 3300, 'gold',     2300, 'active'),
  ('Fernanda', 'Hinojosa',   'F', '1991-09-25', 'whatsapp', false, true,  true,  :'store_ags', :'ba_ags_3',:'ba_ags_3', 120, 6,  20,   7600, 2, 3800, 'silver',    850, 'active'),
  ('Gabriela', 'Inzunza',    'F', '1976-02-11', 'sms',      false, true,  false, :'store_ags', :'cm_ags',  :'ba_ags_1', 315, 39, 90,  16900, 5, 3380, 'silver',   1900, 'at_risk'),
  ('Hilda',    'Jaime',      'F', '1994-10-29', 'email',    true,  true,  true,  :'store_ags', :'ba_ags_1',:'ba_ags_1',  40,  4, 11,   3050, 1, 3050,  NULL,        350, 'new'),
  ('Irma',     'Karam',      'F', '1989-04-16', 'whatsapp', true,  true,  true,  :'store_ags', :'ba_ags_2',:'ba_ags_2', 175, 15, 41,  11400, 3, 3800, 'silver',   1300, 'active'),
  ('Jocelyn',  'Lechuga',    'F', '1986-07-30', 'email',    true,  true,  false, :'store_ags', :'ba_ags_3',:'ba_ags_3', 130, 7,  21,   8400, 2, 4200, 'silver',    950, 'active'),
  ('Karla',    'Mireles',    'F', '1971-11-13', 'whatsapp', true,  true,  true,  :'store_ags', :'cm_ags',  :'cm_ags',   335, 42, 99,  23800, 7, 3400, 'gold',     2700, 'at_risk'),
  ('Liliana',  'Negrete',    'F', '1996-08-26', 'email',    true,  false, true,  :'store_ags', :'ba_ags_1',:'ba_ags_1',  55,  7, 14,   4020, 1, 4020,  NULL,        450, 'new'),
  ('Mariana',  'Ozuna',      'F', '1990-03-12', 'whatsapp', false, true,  true,  :'store_ags', :'ba_ags_2',:'ba_ags_2', 160, 17, 43,  10200, 3, 3400, 'silver',   1200, 'active'),
  ('Nelida',   'Pizano',     'F', '1987-12-05', 'sms',      false, true,  false, :'store_ags', :'ba_ags_3',:'ba_ags_3', 225, 25, 67,  11200, 3, 3733,  NULL,       1250, 'at_risk'),
  ('Odalys',   'Quezada',    'F', '1997-06-20', 'email',    true,  false, true,  :'store_ags', :'ba_ags_1',:'ba_ags_1',  28,  3,  8,   2870, 1, 2870,  NULL,        300, 'new'),
  ('Paola',    'Reveles',    'F', '1983-02-04', 'whatsapp', true,  true,  true,  :'store_ags', :'cm_ags',  :'cm_ags',   250, 20, 54,  19200, 5, 3840, 'gold',     2250, 'active'),
  ('Quetzalli','Saldana',    'F', '1992-11-17', 'email',    true,  true,  false, :'store_ags', :'ba_ags_2',:'ba_ags_2',  90,  9, 24,   5740, 2, 2870, 'silver',    650, 'active'),
  ('Raquel',   'Tovar',      'F', '1989-07-08', 'whatsapp', false, true,  true,  :'store_ags', :'ba_ags_3',:'ba_ags_3', 195, 13, 36,  12800, 4, 3200, 'silver',   1450, 'active'),
  ('Soledad',  'Uribe',      'F', '1986-04-22', 'whatsapp', true,  false, true,  :'store_ags', :'ba_ags_1',:'ba_ags_1', 115,  5, 17,   7100, 2, 3550, 'silver',    800, 'active'),
  ('Tania',    'Villarreal', 'F', '1991-09-13', 'email',    true,  true,  true,  :'store_ags', :'ba_ags_2',:'ba_ags_2',  48,  4, 12,   3050, 1, 3050,  NULL,        350, 'new'),

  -- ── Tijuana (MX-NOROESTE) 20 customers ────────────────────────────────
  ('Alicia',   'Carrasco',   'F', '1987-05-09', 'whatsapp', true,  true,  true,  :'store_tijuana', :'cm_tijuana',     :'ba_tijuana_1', 185, 8,  23,  17200, 5, 3440, 'gold',     2000, 'vip'),
  ('Berenice', 'Davila',     'F', '1993-12-16', 'email',    true,  false, true,  :'store_tijuana', :'ba_tijuana_1', :'ba_tijuana_1',   140, 14, 38,   9100, 3, 3033, 'silver',   1050, 'active'),
  ('Cinthia',  'Escamilla',  'F', '1989-09-02', 'whatsapp', false, true,  true,  :'store_tijuana', :'ba_tijuana_2', :'ba_tijuana_2',    95, 18, 51,   5400, 1, 5400, 'silver',    600, 'at_risk'),
  ('Diana',    'Felix',      'F', '1995-04-25', 'email',    true,  true,  false, :'store_tijuana', :'ba_tijuana_2', :'ba_tijuana_2',    55,  9, 18,   3700, 1, 3700,  NULL,        400, 'new'),
  ('Elsa',     'Guerra',     'F', '1980-08-13', 'whatsapp', true,  false, true,  :'store_tijuana', :'cm_tijuana',     :'cm_tijuana',     245, 21, 61,  18800, 6, 3133, 'gold',     2200, 'active'),
  ('Florencia','Holguin',    'F', '1992-10-08', 'whatsapp', false, true,  true,  :'store_tijuana', :'ba_tijuana_3', :'ba_tijuana_3',   125, 7,  21,   7400, 2, 3700, 'silver',    850, 'active'),
  ('Graciela', 'Ibarra',     'F', '1975-03-31', 'sms',      false, true,  false, :'store_tijuana', :'cm_tijuana',     :'ba_tijuana_1',   305, 35, 88,  17000, 5, 3400, 'silver',   1900, 'at_risk'),
  ('Hilaria',  'Jimenez',    'F', '1994-07-19', 'email',    true,  true,  true,  :'store_tijuana', :'ba_tijuana_1', :'ba_tijuana_1',    32,  4, 10,   2870, 1, 2870,  NULL,        300, 'new'),
  ('Ines',     'Lugo',       'F', '1988-02-26', 'whatsapp', true,  true,  true,  :'store_tijuana', :'ba_tijuana_2', :'ba_tijuana_2',   165, 13, 38,  11200, 3, 3733, 'silver',   1300, 'active'),
  ('Janet',    'Martinez',   'F', '1985-11-04', 'email',    true,  true,  false, :'store_tijuana', :'ba_tijuana_3', :'ba_tijuana_3',   125,  6, 20,   8200, 2, 4100, 'silver',    900, 'active'),
  ('Karina',   'Navarro',    'F', '1973-08-15', 'whatsapp', true,  true,  true,  :'store_tijuana', :'cm_tijuana',     :'cm_tijuana',     320, 37, 91,  22100, 7, 3157, 'gold',     2550, 'at_risk'),
  ('Lupita',   'Orozco',     'F', '1996-05-30', 'email',    true,  false, true,  :'store_tijuana', :'ba_tijuana_1', :'ba_tijuana_1',    48,  6, 13,   4020, 1, 4020,  NULL,        450, 'new'),
  ('Maria',    'Peralta',    'F', '1990-12-18', 'whatsapp', false, true,  true,  :'store_tijuana', :'ba_tijuana_2', :'ba_tijuana_2',   150, 16, 42,   9540, 3, 3180, 'silver',   1100, 'active'),
  ('Norma',    'Quiroga',    'F', '1987-09-11', 'sms',      false, true,  false, :'store_tijuana', :'ba_tijuana_3', :'ba_tijuana_3',   215, 24, 64,  10600, 3, 3533,  NULL,       1200, 'at_risk'),
  ('Olivia',   'Robles',     'F', '1997-03-04', 'email',    true,  false, true,  :'store_tijuana', :'ba_tijuana_1', :'ba_tijuana_1',    22,  2,  7,   2870, 1, 2870,  NULL,        300, 'new'),
  ('Patricia', 'Sandoval',   'F', '1982-06-22', 'whatsapp', true,  true,  true,  :'store_tijuana', :'cm_tijuana',     :'cm_tijuana',     255, 20, 53,  19800, 5, 3960, 'gold',     2300, 'active'),
  ('Reyna',    'Tejeda',     'F', '1991-10-09', 'email',    true,  true,  false, :'store_tijuana', :'ba_tijuana_2', :'ba_tijuana_2',    85,  8, 22,   5740, 2, 2870, 'silver',    650, 'active'),
  ('Sandra',   'Urbieta',    'F', '1988-04-28', 'whatsapp', false, true,  true,  :'store_tijuana', :'ba_tijuana_3', :'ba_tijuana_3',   180, 12, 35,  12400, 4, 3100, 'silver',   1400, 'active'),
  ('Tatiana',  'Valdes',     'F', '1986-01-12', 'whatsapp', true,  false, true,  :'store_tijuana', :'ba_tijuana_1', :'ba_tijuana_1',   118,  5, 16,   7100, 2, 3550, 'silver',    800, 'active'),
  ('Yadira',   'Zavala',     'F', '1992-08-08', 'email',    true,  true,  true,  :'store_tijuana', :'ba_tijuana_2', :'ba_tijuana_2',    50,  4, 12,   3050, 1, 3050,  NULL,        350, 'new'),

  -- ── Toreo (EDOMEX-VM) 20 customers ────────────────────────────────────
  ('Abril',    'Aguilera',   'F', '1984-07-14', 'whatsapp', true,  true,  true,  :'store_toreo', :'cm_toreo',     :'ba_toreo_1', 200, 7,  22,  17800, 5, 3560, 'gold',     2050, 'vip'),
  ('Belen',    'Barocio',    'F', '1991-02-26', 'email',    true,  false, true,  :'store_toreo', :'ba_toreo_1', :'ba_toreo_1',   142, 12, 36,   9400, 3, 3133, 'silver',   1100, 'active'),
  ('Carmen',   'Carbajal',   'F', '1988-10-19', 'whatsapp', false, true,  true,  :'store_toreo', :'ba_toreo_2', :'ba_toreo_2',    98, 16, 49,   5740, 2, 2870, 'silver',    650, 'at_risk'),
  ('Daniela',  'Davila',     'F', '1994-06-08', 'email',    true,  true,  false, :'store_toreo', :'ba_toreo_2', :'ba_toreo_2',    58,  8, 17,   4020, 1, 4020,  NULL,        450, 'new'),
  ('Erika',    'Espindola',  'F', '1979-11-22', 'whatsapp', true,  false, true,  :'store_toreo', :'cm_toreo',     :'cm_toreo',    250, 22, 62,  20200, 6, 3367, 'gold',     2350, 'active'),
  ('Frida',    'Fuentes',    'F', '1992-09-17', 'whatsapp', false, true,  true,  :'store_toreo', :'ba_toreo_3', :'ba_toreo_3',   122,  6, 19,   7400, 2, 3700, 'silver',    850, 'active'),
  ('Genoveva', 'Hurtado',    'F', '1974-04-04', 'sms',      false, true,  false, :'store_toreo', :'cm_toreo',     :'ba_toreo_1', 310, 38, 89,  17600, 5, 3520, 'silver',   1950, 'at_risk'),
  ('Hilda',    'Iniestra',   'F', '1993-08-30', 'email',    true,  true,  true,  :'store_toreo', :'ba_toreo_1', :'ba_toreo_1',    36,  3, 10,   2870, 1, 2870,  NULL,        300, 'new'),
  ('Itzel',    'Juarez',     'F', '1989-03-23', 'whatsapp', true,  true,  true,  :'store_toreo', :'ba_toreo_2', :'ba_toreo_2',   168, 14, 39,  11400, 3, 3800, 'silver',   1300, 'active'),
  ('Jocelyn',  'Larios',     'F', '1986-12-11', 'email',    true,  true,  false, :'store_toreo', :'ba_toreo_3', :'ba_toreo_3',   128,  6, 22,   8400, 2, 4200, 'silver',    950, 'active'),
  ('Karina',   'Manzanares', 'F', '1976-09-05', 'whatsapp', true,  true,  true,  :'store_toreo', :'cm_toreo',     :'cm_toreo',    330, 41, 97,  23200, 7, 3314, 'gold',     2650, 'at_risk'),
  ('Lourdes',  'Naranjo',    'F', '1995-05-19', 'email',    true,  false, true,  :'store_toreo', :'ba_toreo_1', :'ba_toreo_1',    52,  5, 13,   4020, 1, 4020,  NULL,        450, 'new'),
  ('Mayra',    'Ortega',     'F', '1990-01-08', 'whatsapp', false, true,  true,  :'store_toreo', :'ba_toreo_2', :'ba_toreo_2',   157, 17, 45,   9540, 3, 3180, 'silver',   1100, 'active'),
  ('Nataly',   'Pruneda',    'F', '1987-10-26', 'sms',      false, true,  false, :'store_toreo', :'ba_toreo_3', :'ba_toreo_3',   222, 25, 66,  10700, 3, 3567,  NULL,       1200, 'at_risk'),
  ('Odette',   'Quintero',   'F', '1997-04-13', 'email',    true,  false, true,  :'store_toreo', :'ba_toreo_1', :'ba_toreo_1',    24,  2,  6,   2870, 1, 2870,  NULL,        300, 'new'),
  ('Paulina',  'Renteria',   'F', '1983-07-29', 'whatsapp', true,  true,  true,  :'store_toreo', :'cm_toreo',     :'cm_toreo',    256, 19, 51,  19400, 5, 3880, 'gold',     2250, 'active'),
  ('Quetzalli','Soto',       'F', '1992-11-02', 'email',    true,  true,  false, :'store_toreo', :'ba_toreo_2', :'ba_toreo_2',    82,  7, 23,   5740, 2, 2870, 'silver',    650, 'active'),
  ('Raquel',   'Tavera',     'F', '1989-06-15', 'whatsapp', false, true,  true,  :'store_toreo', :'ba_toreo_3', :'ba_toreo_3',   175, 11, 32,  12200, 4, 3050, 'silver',   1400, 'active'),
  ('Sofia',    'Urias',      'F', '1986-02-04', 'whatsapp', true,  false, true,  :'store_toreo', :'ba_toreo_1', :'ba_toreo_1',   112,  5, 16,   7100, 2, 3550, 'silver',    800, 'active'),
  ('Tamara',   'Vasquez',    'F', '1991-08-21', 'email',    true,  true,  true,  :'store_toreo', :'ba_toreo_2', :'ba_toreo_2',    44,  4, 11,   3050, 1, 3050,  NULL,        350, 'new'),

  -- ── Interlomas (EDOMEX-VM) 20 customers ───────────────────────────────
  ('Antonia',  'Aldama',     'F', '1986-04-08', 'whatsapp', true,  true,  true,  :'store_interlomas', :'cm_interlomas',  :'ba_interlomas_1', 198, 7,  24, 18200, 5, 3640, 'gold',     2100, 'vip'),
  ('Brenda',   'Barron',     'F', '1992-11-16', 'email',    true,  false, true,  :'store_interlomas', :'ba_interlomas_1',:'ba_interlomas_1', 138, 13, 37,  9700, 3, 3233, 'silver',   1100, 'active'),
  ('Concepcion','Cebreros',  'F', '1987-08-29', 'whatsapp', false, true,  true,  :'store_interlomas', :'ba_interlomas_2',:'ba_interlomas_2',  92, 17, 50,  5740, 2, 2870, 'silver',    650, 'at_risk'),
  ('Daniela',  'Davalos',    'F', '1995-06-23', 'email',    true,  true,  false, :'store_interlomas', :'ba_interlomas_2',:'ba_interlomas_2',  62, 11, 19,  4020, 1, 4020,  NULL,        450, 'new'),
  ('Estela',   'Echeverria', 'F', '1981-12-30', 'whatsapp', true,  false, true,  :'store_interlomas', :'cm_interlomas',  :'cm_interlomas',   235, 21, 60, 20800, 6, 3467, 'gold',     2400, 'active'),
  ('Frida',    'Garcia',     'F', '1993-04-15', 'whatsapp', false, true,  true,  :'store_interlomas', :'ba_interlomas_3',:'ba_interlomas_3', 118,  6, 20,  7400, 2, 3700, 'silver',    850, 'active'),
  ('Genoveva', 'Hernandez',  'F', '1977-07-08', 'sms',      false, true,  false, :'store_interlomas', :'cm_interlomas',  :'ba_interlomas_1', 285, 32, 85, 18800, 5, 3760, 'silver',   2100, 'at_risk'),
  ('Helena',   'Iriarte',    'F', '1994-09-25', 'email',    true,  true,  true,  :'store_interlomas', :'ba_interlomas_1',:'ba_interlomas_1',  38,  4, 11,  2870, 1, 2870,  NULL,        300, 'new'),
  ('Ines',     'Juarez',     'F', '1989-01-12', 'whatsapp', true,  true,  true,  :'store_interlomas', :'ba_interlomas_2',:'ba_interlomas_2', 172, 14, 41, 11600, 3, 3867, 'silver',   1350, 'active'),
  ('Julieta',  'Lechuga',    'F', '1985-10-30', 'email',    true,  true,  false, :'store_interlomas', :'ba_interlomas_3',:'ba_interlomas_3', 132,  6, 23,  8400, 2, 4200, 'silver',    950, 'active'),
  ('Karla',    'Mata',       'F', '1972-05-17', 'whatsapp', true,  true,  true,  :'store_interlomas', :'cm_interlomas',  :'cm_interlomas',   340, 43, 98, 24200, 7, 3457, 'gold',     2800, 'at_risk'),
  ('Lourdes',  'Nieto',      'F', '1996-03-04', 'email',    true,  false, true,  :'store_interlomas', :'ba_interlomas_1',:'ba_interlomas_1',  54,  6, 14,  4020, 1, 4020,  NULL,        450, 'new'),
  ('Marlene',  'Oropeza',    'F', '1990-08-22', 'whatsapp', false, true,  true,  :'store_interlomas', :'ba_interlomas_2',:'ba_interlomas_2', 162, 17, 44,  9700, 3, 3233, 'silver',   1150, 'active'),
  ('Norma',    'Palomares',  'F', '1987-12-14', 'sms',      false, true,  false, :'store_interlomas', :'ba_interlomas_3',:'ba_interlomas_3', 228, 26, 68, 10900, 3, 3633,  NULL,       1200, 'at_risk'),
  ('Olga',     'Quintanar',  'F', '1997-05-21', 'email',    true,  false, true,  :'store_interlomas', :'ba_interlomas_1',:'ba_interlomas_1',  26,  3,  8,  2870, 1, 2870,  NULL,        300, 'new'),
  ('Paola',    'Ramos',      'F', '1982-02-08', 'whatsapp', true,  true,  true,  :'store_interlomas', :'cm_interlomas',  :'cm_interlomas',   260, 20, 55, 19800, 5, 3960, 'gold',     2300, 'active'),
  ('Quetzal',  'Salcido',    'F', '1991-11-27', 'email',    true,  true,  false, :'store_interlomas', :'ba_interlomas_2',:'ba_interlomas_2',  84,  8, 24,  5740, 2, 2870, 'silver',    650, 'active'),
  ('Rebeca',   'Toledano',   'F', '1988-06-09', 'whatsapp', false, true,  true,  :'store_interlomas', :'ba_interlomas_3',:'ba_interlomas_3', 178, 11, 33, 12400, 4, 3100, 'silver',   1400, 'active'),
  ('Susana',   'Urrutia',    'F', '1985-09-18', 'whatsapp', true,  false, true,  :'store_interlomas', :'ba_interlomas_1',:'ba_interlomas_1', 114,  5, 16,  7100, 2, 3550, 'silver',    800, 'active'),
  ('Tatiana',  'Velez',      'F', '1992-07-10', 'email',    true,  true,  true,  :'store_interlomas', :'ba_interlomas_2',:'ba_interlomas_2',  46,  4, 12,  3050, 1, 3050,  NULL,        350, 'new')
) AS v(
  first_name, last_name, gender, birthday, channel,
  opt_email, opt_sms, opt_whatsapp,
  store_id, created_by, assigned_to,
  enrolled_days_ago, last_interact_days, last_order_days,
  total_spent, orders, aov,
  loyalty_tier, loyalty_points, lifecycle
);

-- ── Orders + line_items ──────────────────────────────────────────────────
-- Generate ~6 orders per VIP, ~3 per active, ~1 per at_risk/new, all from
-- customers we just inserted. Each order uses one real product matching
-- the BA's brand. Distributed across the last 90 days.

WITH demo_customers AS (
  SELECT
    c.id,
    c.signup_store_id,
    c.assigned_to_user_id,
    c.lifecycle_stage,
    c.total_spent,
    c.enrolled_at,
    u.brand_id AS ba_brand_id,
    ROW_NUMBER() OVER (ORDER BY c.id) AS rn
  FROM customers c
  JOIN users u ON u.id = c.assigned_to_user_id
  WHERE c.email LIKE '%@demo-nrm.mx'
),
order_plan AS (
  SELECT
    dc.id AS customer_id,
    dc.signup_store_id AS store_id,
    dc.assigned_to_user_id AS attributed_user_id,
    dc.ba_brand_id,
    dc.rn,
    -- pick product: cycle through 5 LANC or 6 YSL based on brand+rn
    CASE
      WHEN dc.ba_brand_id = :'brand_lancome' THEN
        (ARRAY[
          :'p_lc_lavie'::uuid, :'p_lc_idole_fr'::uuid, :'p_lc_lash'::uuid,
          :'p_lc_tiu'::uuid,   :'p_lc_genif'::uuid
        ])[((dc.rn + gs.n) % 5) + 1]
      ELSE
        (ARRAY[
          :'p_ysl_libre'::uuid, :'p_ysl_ff'::uuid, :'p_ysl_berry'::uuid,
          :'p_ysl_blush'::uuid, :'p_ysl_psp'::uuid, :'p_ysl_nr'::uuid
        ])[((dc.rn + gs.n) % 6) + 1]
    END AS product_id,
    gs.n AS order_seq,
    -- spread across last 90d, biased toward recent
    NOW() - ((5 + (gs.n * 11 + dc.rn * 3) % 85) || ' days')::interval AS processed_at
  FROM demo_customers dc
  CROSS JOIN LATERAL generate_series(
    1,
    CASE dc.lifecycle_stage
      WHEN 'vip'     THEN 6
      WHEN 'active'  THEN 3
      WHEN 'at_risk' THEN 2
      ELSE 1
    END
  ) AS gs(n)
),
inserted_orders AS (
  INSERT INTO orders (
    order_number, customer_id, store_id, channel, currency,
    subtotal_price, total_tax, total_discounts, total_shipping, total_price,
    financial_status, fulfillment_status,
    attributed_user_id, attribution_source,
    processed_at, created_at, updated_at
  )
  SELECT
    'NRD-' || LPAD((ROW_NUMBER() OVER (ORDER BY op.processed_at, op.customer_id))::text, 6, '0'),
    op.customer_id,
    op.store_id,
    'in_store',
    'MXN',
    p.price * 1,           -- subtotal
    p.price * 0.16,        -- IVA 16%
    0, 0,
    p.price * 1.16,        -- total
    'paid', 'fulfilled',
    op.attributed_user_id,
    'in_store_associate',
    op.processed_at,
    op.processed_at,
    op.processed_at
  FROM order_plan op
  JOIN products p ON p.id = op.product_id
  RETURNING id, customer_id, store_id, attributed_user_id, processed_at, total_price
)
INSERT INTO line_items (order_id, product_id, sku, title, quantity, price, total_discount)
SELECT
  io.id,
  op.product_id,
  p.sku,
  p.title,
  1,
  p.price,
  0
FROM inserted_orders io
JOIN order_plan op
  ON op.customer_id = io.customer_id
 AND op.store_id = io.store_id
 AND op.attributed_user_id = io.attributed_user_id
 AND op.processed_at = io.processed_at
JOIN products p ON p.id = op.product_id;


-- ── Recommendations ──────────────────────────────────────────────────────
-- ~80 recos: each demo customer gets 0-2 recos from their BA, ~55% converted
-- to the most recent order of that customer.

INSERT INTO recommendations (
  customer_id, product_id, recommended_by_user_id, store_id,
  recommended_at, source, ai_reasoning, notes, visit_purpose,
  is_converted, converted_order_id
)
SELECT
  c.id,
  CASE
    WHEN u.brand_id = :'brand_lancome' THEN
      (ARRAY[:'p_lc_lavie'::uuid, :'p_lc_genif'::uuid, :'p_lc_tiu'::uuid, :'p_lc_idole_fr'::uuid])
        [((ROW_NUMBER() OVER (ORDER BY c.id)) % 4) + 1]
    ELSE
      (ARRAY[:'p_ysl_libre'::uuid, :'p_ysl_psp'::uuid, :'p_ysl_berry'::uuid, :'p_ysl_nr'::uuid])
        [((ROW_NUMBER() OVER (ORDER BY c.id)) % 4) + 1]
  END,
  c.assigned_to_user_id,
  c.signup_store_id,
  NOW() - ((10 + (ROW_NUMBER() OVER (ORDER BY c.id)) % 60) || ' days')::interval,
  'advisor',
  CASE c.lifecycle_stage
    WHEN 'vip'    THEN 'Cliente VIP — match con perfil de fragancia floral premium'
    WHEN 'active' THEN 'Recomendación post-consulta de skincare'
    ELSE               'Primera consulta — descubrimiento de marca'
  END,
  NULL,
  'consult',
  c.lifecycle_stage IN ('vip', 'active'),
  NULL
FROM customers c
JOIN users u ON u.id = c.assigned_to_user_id
WHERE c.email LIKE '%@demo-nrm.mx'
  AND c.lifecycle_stage IN ('vip', 'active', 'at_risk');


-- ── Samples ──────────────────────────────────────────────────────────────
-- ~40 samples for 'new' and 'active' customers, ~30% converted.

INSERT INTO samples (
  customer_id, product_id, delivered_by_user_id, store_id,
  delivered_at, is_converted
)
SELECT
  c.id,
  CASE
    WHEN u.brand_id = :'brand_lancome' THEN :'p_lc_lash'::uuid
    ELSE :'p_ysl_blush'::uuid
  END,
  c.assigned_to_user_id,
  c.signup_store_id,
  NOW() - ((3 + (ROW_NUMBER() OVER (ORDER BY c.id)) % 45) || ' days')::interval,
  (ROW_NUMBER() OVER (ORDER BY c.id)) % 3 = 0
FROM customers c
JOIN users u ON u.id = c.assigned_to_user_id
WHERE c.email LIKE '%@demo-nrm.mx'
  AND c.lifecycle_stage IN ('new', 'active');


-- ── Message Templates ────────────────────────────────────────────────────
-- 8 templates: 4 per brand × 4 channels/campaigns. Created so /national/templates
-- has real content. Brand-scoped — visible to NRM (his division owns both brands).

INSERT INTO message_templates (brand_id, name, channel, body, campaign_type, is_active) VALUES
  (:'brand_lancome', '[NRM] Lancôme — Bienvenida VIP', 'whatsapp',
   'Hola {{first_name}}, soy {{advisor_name}} de Lancôme en {{store_name}}. Como cliente VIP, te invito a descubrir nuestra nueva edición de Idôle. ¿Te agendamos una consulta privada esta semana?',
   'welcome', true),
  (:'brand_lancome', '[NRM] Lancôme — Recordatorio de cita', 'sms',
   'Lancôme: te recordamos tu cita de consulta personalizada el {{appointment_date}} a las {{appointment_time}} en {{store_name}}. ¡Te esperamos!',
   'appointment_reminder', true),
  (:'brand_lancome', '[NRM] Lancôme — Lanzamiento Génifique', 'email',
   'Querida {{first_name}}, descubre la nueva generación de nuestro best-seller Génifique Ultimate. Resultados visibles en 7 días. Reserva tu muestra exclusiva en {{store_name}}.',
   'product_launch', true),
  (:'brand_lancome', '[NRM] Lancôme — Cumpleaños', 'whatsapp',
   '¡Feliz cumpleaños {{first_name}}! Como regalo, tienes 15% de descuento en cualquier fragancia Lancôme este mes. Te esperamos en {{store_name}}.',
   'birthday', true),

  (:'brand_ysl', '[NRM] YSL Beauté — Bienvenida', 'whatsapp',
   'Bonjour {{first_name}}, soy {{advisor_name}} de Yves Saint Laurent Beauté en {{store_name}}. Te invito a descubrir nuestra colección Libre. ¿Cuándo te puedo recibir?',
   'welcome', true),
  (:'brand_ysl', '[NRM] YSL Beauté — Confirmación compra', 'sms',
   'YSL Beauté: gracias por tu compra de {{product_name}}. Tu BA {{advisor_name}} está disponible para resolver cualquier duda sobre uso o cuidado.',
   'order_confirmation', true),
  (:'brand_ysl', '[NRM] YSL Beauté — Libre Berry Crush', 'email',
   '{{first_name}}, presentamos Libre Berry Crush — la nueva intensidad floral de la fragancia más icónica de YSL. Reserva tu sesión de descubrimiento en {{store_name}}.',
   'product_launch', true),
  (:'brand_ysl', '[NRM] YSL Beauté — Reactivación', 'whatsapp',
   '{{first_name}}, hace tiempo que no te vemos en YSL Beauté. Tenemos novedades en Pure Shots Night Reboot que pensamos que te encantarán. ¿Pasas por {{store_name}}?',
   'reengagement', true);


-- ── Customer Segments (NRM scope) ────────────────────────────────────────
-- Real scope model: scope is derived from which FK is set
--   ownerUserId  → personal
--   brandId      → brand-shared
--   divisionId   → division-shared (NRM-level)
--   all null     → global (admin)

INSERT INTO customer_segments (
  owner_user_id, brand_id, division_id, name, description, filter, is_dynamic
) VALUES
  -- Division-scoped: visible to every brand in Luxe
  (NULL, NULL, :'division_luxe',
   '[NRM] Luxe — Clientas VIP nacionales',
   'Clientas con loyalty_tier gold y total_spent > 15,000 MXN en cualquier marca Luxe.',
   '{"loyaltyTier": ["gold"], "totalSpentMin": 15000}'::jsonb,
   true),

  -- Brand-scoped (Lancôme)
  (NULL, :'brand_lancome', NULL,
   '[NRM] Lancôme — Top Spenders 90 días',
   'Top compradoras de Lancôme con orders en los últimos 90 días.',
   '{"daysSinceLastOrderMax": 90, "totalSpentMin": 10000}'::jsonb,
   true),

  -- Brand-scoped (YSL)
  (NULL, :'brand_ysl', NULL,
   '[NRM] YSL — Cumpleañeras del mes',
   'Clientas YSL con cumpleaños en los próximos 30 días para campaña birthday.',
   '{"birthdayThisMonth": true}'::jsonb,
   true);


-- ── Summary ──────────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM customers WHERE email LIKE '%@demo-nrm.mx') AS customers,
  (SELECT COUNT(*) FROM orders WHERE order_number LIKE 'NRD-%')      AS orders,
  (SELECT COUNT(*) FROM line_items WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'NRD-%')) AS line_items,
  (SELECT COUNT(*) FROM recommendations WHERE customer_id IN (SELECT id FROM customers WHERE email LIKE '%@demo-nrm.mx')) AS recommendations,
  (SELECT COUNT(*) FROM samples WHERE customer_id IN (SELECT id FROM customers WHERE email LIKE '%@demo-nrm.mx')) AS samples,
  (SELECT COUNT(*) FROM message_templates WHERE name LIKE '[NRM]%') AS templates,
  (SELECT COUNT(*) FROM customer_segments WHERE name LIKE '[NRM]%') AS segments;
