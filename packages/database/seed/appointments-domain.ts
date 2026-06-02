/**
 * Appointments-domain seed — fills in the data that powers the appointment
 * UX end-to-end across the L'Oréal Luxe clienteling demo:
 *
 *   1. Enrich existing service_types with buffers, prices, lead/horizon.
 *   2. Seed an expanded multi-brand catalog (Lancôme + YSL + cross-brand).
 *   3. Seed skills + map BAs to skills + map services to required skills
 *      (Salesforce Scheduler "ServiceResourceSkill" pattern).
 *   4. Seed scheduling_policies (slot granularity, working hours, blackouts).
 *   5. Seed appointment_prepared_products (the "ideabook" — BSPK/Tulip).
 *   6. Backfill appointments.outcome_code from existing data.
 *   7. Backfill orders.appointment_id by a same-customer time-window heuristic.
 *   8. Synthesise cancellation_reason / no_show_reason / confirmedByCustomerAt
 *      so the funnel UI has signal across every status.
 *
 * Idempotent — every insert is guarded with ON CONFLICT DO NOTHING / NOT
 * EXISTS, and updates are scoped to "still null" rows. Re-runs are safe.
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import * as schema from "../schema";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://loreal:loreal@localhost:5433/loreal_clienteling",
  ssl: process.env.DATABASE_URL?.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : undefined,
});
const db = drizzle(pool, { schema });

// ────────────────────────────────────────────────────────────────────────────
// 1) Enrich existing service_types with buffers, prices, lead/horizon
// ────────────────────────────────────────────────────────────────────────────
async function enrichExistingServiceTypes() {
  await db.execute(sql`
    UPDATE service_types SET
      buffer_before_minutes = 5,
      buffer_after_minutes  = 10,
      price                 = 0,
      min_lead_time_minutes = 60,
      max_advance_days      = 60
    WHERE code = 'consulta'
  `);
  await db.execute(sql`
    UPDATE service_types SET
      buffer_before_minutes = 10,
      buffer_after_minutes  = 15,
      price                 = 0,
      min_lead_time_minutes = 120,
      max_advance_days      = 60
    WHERE code = 'diagnostico'
  `);
  await db.execute(sql`
    UPDATE service_types SET
      buffer_before_minutes = 15,
      buffer_after_minutes  = 30,
      price                 = 1200,
      min_lead_time_minutes = 240,
      max_advance_days      = 90
    WHERE code = 'evento'
  `);
  await db.execute(sql`
    UPDATE service_types SET
      buffer_before_minutes = 10,
      buffer_after_minutes  = 20,
      price                 = 800,
      min_lead_time_minutes = 120,
      max_advance_days      = 60
    WHERE code = 'maquillaje'
  `);

  console.log("  ✓ enriched 4 existing service_types with buffers / price / lead time");
}

// ────────────────────────────────────────────────────────────────────────────
// 2) Expanded multi-brand catalog
// ────────────────────────────────────────────────────────────────────────────
async function seedCatalogExpansion() {
  // Resolve brand ids once
  const brandIds = await db.execute<{ code: string; id: string }>(sql`
    SELECT code, id::text FROM brands WHERE code IN ('LANCOME','YSL')
  `);
  const lancome = brandIds.rows.find((r) => r.code === "LANCOME")?.id ?? null;
  const ysl = brandIds.rows.find((r) => r.code === "YSL")?.id ?? null;

  type Svc = {
    code: string;
    displayName: string;
    duration: number;
    bufBefore: number;
    bufAfter: number;
    price: number;
    brandId: string | null;
    maxCapacity: number;
    requiresConfirmation: boolean;
    minLead: number;
    maxAdvance: number;
    color: string;
    description: string;
    sortOrder: number;
  };

  const services: Svc[] = [
    {
      code: "lancome_skin_genius",
      displayName: "Skin Genius diagnosis · Lancôme",
      duration: 30,
      bufBefore: 5,
      bufAfter: 10,
      price: 0,
      brandId: lancome,
      maxCapacity: 1,
      requiresConfirmation: false,
      minLead: 60,
      maxAdvance: 60,
      color: "#ec4899",
      description: "AI-powered skin diagnosis with personalised routine.",
      sortOrder: 10,
    },
    {
      code: "lancome_advanced_genifique",
      displayName: "Advanced Génifique consult · Lancôme",
      duration: 45,
      bufBefore: 10,
      bufAfter: 15,
      price: 0,
      brandId: lancome,
      maxCapacity: 1,
      requiresConfirmation: true,
      minLead: 120,
      maxAdvance: 60,
      color: "#c026d3",
      description: "Personalised Génifique serum consultation with a senior expert.",
      sortOrder: 11,
    },
    {
      code: "lancome_full_makeup",
      displayName: "Full makeup look · Lancôme",
      duration: 60,
      bufBefore: 10,
      bufAfter: 20,
      price: 1200,
      brandId: lancome,
      maxCapacity: 1,
      requiresConfirmation: false,
      minLead: 120,
      maxAdvance: 60,
      color: "#f43f5e",
      description: "Full glam application with Teint Idole + L'Absolu Rouge.",
      sortOrder: 12,
    },
    {
      code: "lancome_bridal_trial",
      displayName: "Bridal trial · Lancôme",
      duration: 90,
      bufBefore: 15,
      bufAfter: 30,
      price: 2500,
      brandId: lancome,
      maxCapacity: 1,
      requiresConfirmation: true,
      minLead: 1440,
      maxAdvance: 90,
      color: "#be185d",
      description: "Bridal makeup trial with a senior makeup artist.",
      sortOrder: 13,
    },
    {
      code: "ysl_lip_bar",
      displayName: "Lip bar · YSL Rouge Pur Couture",
      duration: 20,
      bufBefore: 5,
      bufAfter: 5,
      price: 0,
      brandId: ysl,
      maxCapacity: 1,
      requiresConfirmation: false,
      minLead: 30,
      maxAdvance: 30,
      color: "#dc2626",
      description: "Lip shade discovery with the Rouge Pur Couture range.",
      sortOrder: 20,
    },
    {
      code: "ysl_fragrance_discovery",
      displayName: "Fragrance discovery · YSL",
      duration: 45,
      bufBefore: 10,
      bufAfter: 15,
      price: 0,
      brandId: ysl,
      maxCapacity: 1,
      requiresConfirmation: false,
      minLead: 60,
      maxAdvance: 60,
      color: "#9333ea",
      description: "Olfactory journey across Libre, MYSLF, Black Opium.",
      sortOrder: 21,
    },
    {
      code: "ysl_couture_makeup",
      displayName: "Couture makeup look · YSL",
      duration: 60,
      bufBefore: 10,
      bufAfter: 20,
      price: 1500,
      brandId: ysl,
      maxCapacity: 1,
      requiresConfirmation: false,
      minLead: 120,
      maxAdvance: 60,
      color: "#7e22ce",
      description: "Editorial makeup with All Hours + Couture palettes.",
      sortOrder: 22,
    },
    {
      code: "vip_private_shopping",
      displayName: "VIP private shopping (multi-brand)",
      duration: 120,
      bufBefore: 30,
      bufAfter: 30,
      price: 0,
      brandId: null,
      maxCapacity: 1,
      requiresConfirmation: true,
      minLead: 2880,
      maxAdvance: 90,
      color: "#facc15",
      description: "Invitation-only VIP styling across L'Oréal Luxe brands.",
      sortOrder: 30,
    },
    {
      code: "virtual_skin_consult",
      displayName: "Virtual skin consultation (video)",
      duration: 30,
      bufBefore: 5,
      bufAfter: 10,
      price: 0,
      brandId: null,
      maxCapacity: 1,
      requiresConfirmation: true,
      minLead: 60,
      maxAdvance: 60,
      color: "#0ea5e9",
      description: "Video consultation with a senior advisor.",
      sortOrder: 40,
    },
    {
      code: "masterclass_makeup",
      displayName: "Group masterclass · Makeup",
      duration: 90,
      bufBefore: 15,
      bufAfter: 15,
      price: 600,
      brandId: null,
      maxCapacity: 8,
      requiresConfirmation: true,
      minLead: 1440,
      maxAdvance: 60,
      color: "#16a34a",
      description: "Group makeup masterclass — limited seats.",
      sortOrder: 50,
    },
  ];

  let inserted = 0;
  for (const s of services) {
    const res = await db.execute(sql`
      INSERT INTO service_types
        (code, display_name, duration_minutes, buffer_before_minutes, buffer_after_minutes,
         price, brand_id, max_capacity, requires_confirmation, min_lead_time_minutes,
         max_advance_days, color, description, sort_order, is_active)
      VALUES
        (${s.code}, ${s.displayName}, ${s.duration}, ${s.bufBefore}, ${s.bufAfter},
         ${s.price}, ${s.brandId}, ${s.maxCapacity}, ${s.requiresConfirmation}, ${s.minLead},
         ${s.maxAdvance}, ${s.color}, ${s.description}, ${s.sortOrder}, true)
      ON CONFLICT (code) DO NOTHING
    `);
    inserted += res.rowCount ?? 0;
  }
  console.log(`  ✓ catalog expansion: ${inserted} new service_types inserted (out of ${services.length})`);
}

// ────────────────────────────────────────────────────────────────────────────
// 3) Skills catalog + BA mapping + service requirements
// ────────────────────────────────────────────────────────────────────────────
async function seedSkills() {
  const skills = [
    ["brand_lancome",       "Lancôme certified",          "brand",         "Trained on Lancôme catalog and protocols.",       10],
    ["brand_ysl",           "YSL certified",              "brand",         "Trained on YSL Beauty catalog and protocols.",    11],
    ["svc_skin_diagnosis",  "Skin diagnosis",             "service",       "Qualified for Skin Genius / AI-based diagnostics.", 20],
    ["svc_makeup_advanced", "Advanced makeup",            "service",       "Qualified for editorial / bridal / event makeup.", 21],
    ["svc_fragrance",       "Fragrance expert",           "service",       "Olfactory training, family expertise.",            22],
    ["svc_color_match",     "Foundation color match",     "service",       "Trained on shade matching across foundations.",    23],
    ["svc_bridal",          "Bridal specialist",          "service",       "Bridal trials and event-day execution.",           24],
    ["svc_virtual_consult", "Virtual consultation",       "service",       "Trained and equipped for video consultations.",    25],
    ["lang_es",             "Spanish",                    "language",      "Fluent Spanish.",                                   30],
    ["lang_en",             "English",                    "language",      "Fluent English.",                                   31],
    ["lang_fr",             "French",                     "language",      "Fluent French.",                                    32],
    ["cert_sensitive_skin", "Sensitive skin certified",   "certification", "Certified to advise on sensitive / reactive skin.", 40],
    ["cert_pregnancy_safe", "Pregnancy-safe ingredients", "certification", "Trained on pregnancy-safe ingredient guidance.",    41],
  ] as const;

  let inserted = 0;
  for (const [code, name, category, desc, order] of skills) {
    const res = await db.execute(sql`
      INSERT INTO skills (code, display_name, category, description, sort_order)
      VALUES (${code}, ${name}, ${category}, ${desc}, ${order})
      ON CONFLICT (code) DO NOTHING
    `);
    inserted += res.rowCount ?? 0;
  }
  console.log(`  ✓ skills: ${inserted}/${skills.length} new`);
}

async function mapUserSkills() {
  // Spanish for every active BA
  const r1 = await db.execute(sql`
    INSERT INTO user_skills (user_id, skill_id, proficiency)
    SELECT u.id, (SELECT id FROM skills WHERE code='lang_es'), 5
    FROM users u
    WHERE u.role = 'beauty_advisor' AND u.is_active = true
    ON CONFLICT (user_id, skill_id) DO NOTHING
  `);
  // English for ~50% of BAs (by hash parity)
  const r2 = await db.execute(sql`
    INSERT INTO user_skills (user_id, skill_id, proficiency)
    SELECT u.id, (SELECT id FROM skills WHERE code='lang_en'),
           CASE WHEN (abs(hashtext(u.id)) % 3) > 0 THEN 4 ELSE 3 END
    FROM users u
    WHERE u.role = 'beauty_advisor' AND u.is_active = true
      AND (abs(hashtext(u.id)) % 2) = 0
    ON CONFLICT (user_id, skill_id) DO NOTHING
  `);
  // Specialty-driven skills
  const r3 = await db.execute(sql`
    INSERT INTO user_skills (user_id, skill_id, proficiency)
    SELECT u.id, s.id, 4
    FROM users u JOIN skills s ON s.code = 'svc_skin_diagnosis'
    WHERE u.specialty = 'skincare_expert'
    ON CONFLICT (user_id, skill_id) DO NOTHING
  `);
  const r4 = await db.execute(sql`
    INSERT INTO user_skills (user_id, skill_id, proficiency)
    SELECT u.id, s.id, 5
    FROM users u JOIN skills s ON s.code IN ('svc_makeup_advanced','svc_color_match','svc_bridal')
    WHERE u.specialty = 'makeup_artist'
    ON CONFLICT (user_id, skill_id) DO NOTHING
  `);
  const r5 = await db.execute(sql`
    INSERT INTO user_skills (user_id, skill_id, proficiency)
    SELECT u.id, s.id, 5
    FROM users u JOIN skills s ON s.code = 'svc_fragrance'
    WHERE u.specialty = 'fragrance_specialist'
    ON CONFLICT (user_id, skill_id) DO NOTHING
  `);
  const r6 = await db.execute(sql`
    INSERT INTO user_skills (user_id, skill_id, proficiency)
    SELECT u.id, s.id, 3
    FROM users u JOIN skills s ON s.code IN ('svc_color_match','svc_virtual_consult')
    WHERE u.specialty = 'generalist'
    ON CONFLICT (user_id, skill_id) DO NOTHING
  `);
  // Brand skills derived from user's brand_id
  const r7 = await db.execute(sql`
    INSERT INTO user_skills (user_id, skill_id, proficiency)
    SELECT u.id, s.id, 4
    FROM users u
    JOIN brands b ON b.id::text = u.brand_id
    JOIN skills s ON s.code = 'brand_lancome'
    WHERE b.code = 'LANCOME' AND u.role = 'beauty_advisor'
    ON CONFLICT (user_id, skill_id) DO NOTHING
  `);
  const r8 = await db.execute(sql`
    INSERT INTO user_skills (user_id, skill_id, proficiency)
    SELECT u.id, s.id, 4
    FROM users u
    JOIN brands b ON b.id::text = u.brand_id
    JOIN skills s ON s.code = 'brand_ysl'
    WHERE b.code = 'YSL' AND u.role = 'beauty_advisor'
    ON CONFLICT (user_id, skill_id) DO NOTHING
  `);

  const total =
    (r1.rowCount ?? 0) + (r2.rowCount ?? 0) + (r3.rowCount ?? 0) +
    (r4.rowCount ?? 0) + (r5.rowCount ?? 0) + (r6.rowCount ?? 0) +
    (r7.rowCount ?? 0) + (r8.rowCount ?? 0);
  console.log(`  ✓ user_skills: ${total} new mappings`);
}

async function mapServiceRequirements() {
  const mappings: Array<{ services: string[]; skill: string }> = [
    { services: ["lancome_skin_genius","lancome_advanced_genifique","lancome_full_makeup","lancome_bridal_trial"], skill: "brand_lancome" },
    { services: ["ysl_lip_bar","ysl_fragrance_discovery","ysl_couture_makeup"],                                    skill: "brand_ysl" },
    { services: ["diagnostico","lancome_skin_genius","virtual_skin_consult"],                                       skill: "svc_skin_diagnosis" },
    { services: ["maquillaje","lancome_full_makeup","ysl_couture_makeup","masterclass_makeup","lancome_bridal_trial"], skill: "svc_makeup_advanced" },
    { services: ["lancome_bridal_trial"],                                                                            skill: "svc_bridal" },
    { services: ["ysl_fragrance_discovery"],                                                                         skill: "svc_fragrance" },
    { services: ["virtual_skin_consult"],                                                                            skill: "svc_virtual_consult" },
  ];

  let total = 0;
  for (const { services, skill } of mappings) {
    for (const svc of services) {
      const res = await db.execute(sql`
        INSERT INTO service_type_required_skills (service_type_id, skill_id, min_proficiency)
        SELECT st.id, sk.id, NULL
        FROM service_types st
        JOIN skills sk ON sk.code = ${skill}
        WHERE st.code = ${svc}
        ON CONFLICT (service_type_id, skill_id) DO NOTHING
      `);
      total += res.rowCount ?? 0;
    }
  }
  console.log(`  ✓ service_type_required_skills: ${total} new requirements`);
}

// ────────────────────────────────────────────────────────────────────────────
// 4) Scheduling policies
// ────────────────────────────────────────────────────────────────────────────
async function seedSchedulingPolicies() {
  // Global default
  const r1 = await db.execute(sql`
    INSERT INTO scheduling_policies
      (store_id, service_type_id, slot_granularity_minutes, min_lead_time_minutes, max_advance_days,
       active_days, work_window_start, work_window_end, priority, notes)
    SELECT
      NULL, NULL, 30, 60, 60,
      '{"mon":true,"tue":true,"wed":true,"thu":true,"fri":true,"sat":true,"sun":false}'::jsonb,
      '10:00', '20:00', 0, 'Global default scheduling policy.'
    WHERE NOT EXISTS (
      SELECT 1 FROM scheduling_policies WHERE store_id IS NULL AND service_type_id IS NULL
    )
  `);
  // VIP private shopping
  const r2 = await db.execute(sql`
    INSERT INTO scheduling_policies
      (store_id, service_type_id, slot_granularity_minutes, min_lead_time_minutes, max_advance_days,
       active_days, work_window_start, work_window_end, priority, notes)
    SELECT
      NULL, st.id, 60, 2880, 90,
      '{"mon":false,"tue":false,"wed":false,"thu":true,"fri":true,"sat":true,"sun":true}'::jsonb,
      '11:00', '19:00', 10, 'VIP private shopping — long lead, premium window.'
    FROM service_types st
    WHERE st.code = 'vip_private_shopping'
      AND NOT EXISTS (
        SELECT 1 FROM scheduling_policies sp
        WHERE sp.service_type_id = st.id AND sp.store_id IS NULL
      )
  `);
  // Virtual consult
  const r3 = await db.execute(sql`
    INSERT INTO scheduling_policies
      (store_id, service_type_id, slot_granularity_minutes, min_lead_time_minutes, max_advance_days,
       active_days, work_window_start, work_window_end, priority, notes)
    SELECT
      NULL, st.id, 15, 30, 30,
      '{"mon":true,"tue":true,"wed":true,"thu":true,"fri":true,"sat":true,"sun":true}'::jsonb,
      '09:00', '21:00', 10, 'Virtual consult — flexible window including Sunday.'
    FROM service_types st
    WHERE st.code = 'virtual_skin_consult'
      AND NOT EXISTS (
        SELECT 1 FROM scheduling_policies sp
        WHERE sp.service_type_id = st.id AND sp.store_id IS NULL
      )
  `);

  const total = (r1.rowCount ?? 0) + (r2.rowCount ?? 0) + (r3.rowCount ?? 0);
  console.log(`  ✓ scheduling_policies: ${total} new`);
}

// ────────────────────────────────────────────────────────────────────────────
// 5) Appointment prepared products (ideabook)
// ────────────────────────────────────────────────────────────────────────────
async function seedPreparedProducts() {
  const res = await db.execute(sql`
    INSERT INTO appointment_prepared_products
      (appointment_id, product_id, variant_id, position, status, added_by_user_id, added_at, status_changed_at, note)
    SELECT
      a.id,
      p.id,
      NULL,
      p.rn,
      CASE
        WHEN a.status = 'completed' AND p.rn = 1 THEN 'purchased'
        WHEN a.status = 'completed' AND p.rn = 2 THEN 'tried'
        WHEN a.status = 'completed'              THEN 'shown'
        WHEN a.status = 'confirmed'              THEN 'prepared'
        ELSE 'prepared'
      END,
      a.staff_user_id,
      a.start_time - interval '2 hours',
      CASE WHEN a.status = 'completed' THEN a.start_time + interval '30 minutes' ELSE NULL END,
      CASE p.rn
        WHEN 1 THEN 'Picked from wishlist'
        WHEN 2 THEN 'Matches skin tone'
        ELSE        'New launch suggestion'
      END
    FROM appointments a
    CROSS JOIN LATERAL (
      SELECT id, row_number() OVER () AS rn
      FROM (
        SELECT id
        FROM products
        ORDER BY hashtext(a.id::text || id::text)
        LIMIT 3
      ) sub
    ) p
    WHERE a.status IN ('scheduled','confirmed','completed')
      AND NOT EXISTS (
        SELECT 1 FROM appointment_prepared_products app
        WHERE app.appointment_id = a.id
      )
  `);
  console.log(`  ✓ appointment_prepared_products: ${res.rowCount ?? 0} rows inserted`);
}

// ────────────────────────────────────────────────────────────────────────────
// 6) Backfill appointments.outcome_code
// ────────────────────────────────────────────────────────────────────────────
async function backfillOutcomeCodes() {
  const r1 = await db.execute(sql`
    UPDATE appointments a
    SET outcome_code = 'sale_closed'
    WHERE a.status = 'completed'
      AND a.outcome_code IS NULL
      AND EXISTS (
        SELECT 1 FROM orders o
        WHERE o.customer_id = a.customer_id
          AND o.processed_at BETWEEN a.start_time AND a.start_time + interval '4 hours'
      )
  `);
  const r2 = await db.execute(sql`
    UPDATE appointments a
    SET outcome_code = 'sample_given'
    WHERE a.status = 'completed'
      AND a.outcome_code IS NULL
      AND EXISTS (
        SELECT 1 FROM samples s
        WHERE s.customer_id = a.customer_id
          AND s.delivered_at BETWEEN a.start_time AND a.start_time + interval '4 hours'
      )
  `);
  const r3 = await db.execute(sql`
    UPDATE appointments
    SET outcome_code = 'no_purchase'
    WHERE status = 'completed' AND outcome_code IS NULL
  `);
  console.log(
    `  ✓ outcome_code backfill: sale_closed=${r1.rowCount ?? 0}, sample_given=${r2.rowCount ?? 0}, no_purchase=${r3.rowCount ?? 0}`,
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 7) Backfill orders.appointment_id by time-window heuristic
// ────────────────────────────────────────────────────────────────────────────
async function backfillOrderAppointmentLink() {
  const res = await db.execute(sql`
    WITH matched AS (
      SELECT DISTINCT ON (o.id)
        o.id AS order_id, a.id AS appointment_id
      FROM orders o
      JOIN appointments a
        ON a.customer_id = o.customer_id
       AND a.status = 'completed'
       AND o.processed_at BETWEEN a.start_time AND a.start_time + interval '4 hours'
      WHERE o.appointment_id IS NULL
      ORDER BY o.id, a.start_time DESC
    )
    UPDATE orders o
    SET appointment_id      = m.appointment_id,
        attribution_source  = COALESCE(o.attribution_source, 'appointment')
    FROM matched m
    WHERE o.id = m.order_id
  `);
  console.log(`  ✓ orders.appointment_id backfill: ${res.rowCount ?? 0} orders linked`);
}

// ────────────────────────────────────────────────────────────────────────────
// 8) Synthetic cancel / no-show reasons + customer-confirmed timestamps
// ────────────────────────────────────────────────────────────────────────────
async function backfillCancellationAndConfirmation() {
  const r1 = await db.execute(sql`
    UPDATE appointments
    SET cancellation_reason = CASE (abs(hashtext(id::text)) % 4)
          WHEN 0 THEN 'customer_request'
          WHEN 1 THEN 'scheduling_conflict'
          WHEN 2 THEN 'sick'
          ELSE         'duplicate'
        END,
        cancelled_at         = COALESCE(updated_at, start_time - interval '1 day'),
        cancelled_by_user_id = staff_user_id
    WHERE status = 'cancelled' AND cancellation_reason IS NULL
  `);
  const r2 = await db.execute(sql`
    UPDATE appointments
    SET no_show_reason = CASE (abs(hashtext(id::text)) % 3)
          WHEN 0 THEN 'forgot'
          WHEN 1 THEN 'running_late_gave_up'
          ELSE         'unknown'
        END
    WHERE status = 'no_show' AND no_show_reason IS NULL
  `);
  const r3 = await db.execute(sql`
    UPDATE appointments
    SET confirmed_by_customer_at = start_time - interval '20 hours'
    WHERE status IN ('confirmed','completed')
      AND confirmed_by_customer_at IS NULL
      AND (abs(hashtext(id::text)) % 3) = 0
  `);
  console.log(
    `  ✓ funnel backfill: cancellations=${r1.rowCount ?? 0}, no-shows=${r2.rowCount ?? 0}, confirmed-by-customer=${r3.rowCount ?? 0}`,
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Seeding appointments-domain demo data\n");

  console.log("[1/8] Service catalog · existing");
  await enrichExistingServiceTypes();

  console.log("\n[2/8] Service catalog · expansion");
  await seedCatalogExpansion();

  console.log("\n[3/8] Skills");
  await seedSkills();
  await mapUserSkills();
  await mapServiceRequirements();

  console.log("\n[4/8] Scheduling policies");
  await seedSchedulingPolicies();

  console.log("\n[5/8] Prepared products (ideabook)");
  await seedPreparedProducts();

  console.log("\n[6/8] Outcome codes");
  await backfillOutcomeCodes();

  console.log("\n[7/8] Order ↔ appointment attribution");
  await backfillOrderAppointmentLink();

  console.log("\n[8/8] Cancellation / no-show / customer-confirmed");
  await backfillCancellationAndConfirmation();

  console.log("\n✅ Appointments-domain seed complete.\n");
  await pool.end();
}

main().catch((err) => {
  console.error("✗ Appointments-domain seed failed:", err);
  pool.end();
  process.exit(1);
});
