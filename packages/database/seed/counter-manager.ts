/**
 * Counter Manager seed — populates the 5 tables built for Juan Perez's
 * dashboard (Liverpool Santa Fe × YSL) so the frontend can render real,
 * consistent data from day one.
 *
 * Idempotent: every insert is guarded with ON CONFLICT or a delete-by-scope
 * preamble, so re-running the script doesn't pile up duplicate rows.
 *
 * Resolves all FK targets dynamically from the DB (store code, user email,
 * brand code, customer name) rather than hard-coding UUIDs — that way the
 * seed survives data resets that re-issue ids.
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { and, eq, sql } from "drizzle-orm";
import * as schema from "../schema";
import {
  users,
  stores,
  brands,
  customers,
  appointments,
  productReservations,
  storeEvents,
  salesTargets,
  approvalRequests,
  shifts,
  baRatings,
  eventAssignments,
} from "../schema";

const STORE_CODE = "LIV-CDMX-SANTA-FE";
const BRAND_CODE = "YSL";
const CM_EMAIL = "juan.perez@loreal-test.mx"; // fallback if email differs
const CM_NAME = "Juan Perez";
const BA1_NAME = "Ana Martinez";
const BA2_NAME = "Emiliano Alvarez";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://loreal:loreal@localhost:5433/loreal_clienteling",
  ssl: process.env.DATABASE_URL?.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : undefined,
});
const db = drizzle(pool, { schema });

// Date helpers — server runs in UTC; the dashboard endpoint computes day
// boundaries in UTC too. Keep timestamps in UTC for consistency.
const today = new Date();
const todayStr = today.toISOString().split("T")[0];
const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
const tomorrowStr = tomorrow.toISOString().split("T")[0];
const dayAfter = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
const dayAfterStr = dayAfter.toISOString().split("T")[0];

function at(date: Date, hours: number, minutes = 0): Date {
  const d = new Date(date);
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
}

async function resolve() {
  const [store] = await db
    .select()
    .from(stores)
    .where(eq(stores.code, STORE_CODE));
  if (!store) throw new Error(`Store ${STORE_CODE} not found`);

  const [brand] = await db
    .select()
    .from(brands)
    .where(eq(brands.code, BRAND_CODE));
  if (!brand) throw new Error(`Brand ${BRAND_CODE} not found`);

  const [counterManager] = await db
    .select()
    .from(users)
    .where(
      and(eq(users.fullName, CM_NAME), eq(users.role, "counter_manager")),
    );
  if (!counterManager) {
    throw new Error(
      `Counter Manager "${CM_NAME}" not found. Run user webhook seed first.`,
    );
  }

  const [ba1] = await db
    .select()
    .from(users)
    .where(eq(users.fullName, BA1_NAME));
  const [ba2] = await db
    .select()
    .from(users)
    .where(eq(users.fullName, BA2_NAME));
  if (!ba1) throw new Error(`BA "${BA1_NAME}" not found`);
  if (!ba2) throw new Error(`BA "${BA2_NAME}" not found`);

  return { store, brand, counterManager, ba1, ba2 };
}

async function seedSalesTargets(ctx: Awaited<ReturnType<typeof resolve>>) {
  const { store, brand, counterManager } = ctx;

  // Wipe targets for this counter so re-runs stay clean.
  await db
    .delete(salesTargets)
    .where(
      and(
        eq(salesTargets.storeId, store.id),
        eq(salesTargets.brandId, brand.id),
      ),
    );

  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  await db.insert(salesTargets).values([
    {
      storeId: store.id,
      brandId: brand.id,
      period: "daily",
      periodDate: todayStr,
      targetAmount: "12000.00",
      currency: "MXN",
      notes: "Objetivo diario YSL Santa Fe",
      createdByUserId: counterManager.id,
    },
    {
      storeId: store.id,
      brandId: brand.id,
      period: "daily",
      periodDate: tomorrowStr,
      targetAmount: "15000.00",
      currency: "MXN",
      notes: "Sábado — incremento esperado por tráfico de mall",
      createdByUserId: counterManager.id,
    },
    {
      storeId: store.id,
      brandId: brand.id,
      period: "monthly",
      periodDate: firstOfMonth,
      targetAmount: "320000.00",
      currency: "MXN",
      notes: "Objetivo mensual aprobado por NRM",
      createdByUserId: counterManager.id,
    },
  ]);

  console.log("  ✓ sales_targets: 3 rows (today + tomorrow + month)");
}

async function seedShifts(ctx: Awaited<ReturnType<typeof resolve>>) {
  const { store, counterManager, ba1, ba2 } = ctx;

  // Clear the upcoming week so re-runs don't UNIQUE-conflict on user+date.
  await db.execute(sql`
    DELETE FROM ${shifts}
    WHERE ${shifts.storeId} = ${store.id}
      AND ${shifts.shiftDate} >= ${todayStr}::date
      AND ${shifts.shiftDate} <= (${todayStr}::date + interval '6 days')
  `);

  const week: Array<{ date: string; jsDate: Date }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
    week.push({ date: d.toISOString().split("T")[0], jsDate: d });
  }

  const rows: (typeof shifts.$inferInsert)[] = [];

  for (const { date, jsDate } of week) {
    const dayOfWeek = jsDate.getUTCDay(); // 0 = Sunday
    const isSunday = dayOfWeek === 0;

    // Counter Manager — works Mon-Sat, off Sunday
    rows.push({
      userId: counterManager.id,
      storeId: store.id,
      shiftDate: date,
      ...(isSunday
        ? { status: "off" }
        : {
            startTime: at(jsDate, 11, 0),
            endTime: at(jsDate, 20, 0),
            status: date === todayStr ? "active" : "scheduled",
          }),
      createdByUserId: counterManager.id,
    });

    // Ana — opening shift Mon-Fri, off weekends
    const anaWorks = dayOfWeek >= 1 && dayOfWeek <= 5;
    rows.push({
      userId: ba1.id,
      storeId: store.id,
      shiftDate: date,
      ...(anaWorks
        ? {
            startTime: at(jsDate, 11, 0),
            endTime: at(jsDate, 17, 0),
            status: date === todayStr ? "active" : "scheduled",
          }
        : { status: "off" }),
      createdByUserId: counterManager.id,
    });

    // Emiliano — closing shift Tue-Sat, off Sun/Mon
    const emilianoWorks = dayOfWeek >= 2 && dayOfWeek <= 6;
    rows.push({
      userId: ba2.id,
      storeId: store.id,
      shiftDate: date,
      ...(emilianoWorks
        ? {
            startTime: at(jsDate, 14, 0),
            endTime: at(jsDate, 21, 0),
            status: date === todayStr ? "active" : "scheduled",
          }
        : { status: "off" }),
      createdByUserId: counterManager.id,
    });
  }

  await db.insert(shifts).values(rows);
  console.log(
    `  ✓ shifts: ${rows.length} rows (CM + 2 BAs × 7 days, weekends respected)`,
  );
}

async function seedApprovalRequests(
  ctx: Awaited<ReturnType<typeof resolve>>,
) {
  const { store, brand, ba1, ba2 } = ctx;

  // Wipe approvals raised by BAs of this store so re-runs are clean.
  await db
    .delete(approvalRequests)
    .where(eq(approvalRequests.storeId, store.id));

  // Resolve 3 customers to attach to the approvals (Sofía VIP, Andrés VIP,
  // Renata gold) plus the real held reservation belonging to Sofía.
  const sofia = await findCustomerByName("Sofía", "Mendoza");
  const andres = await findCustomerByName("Andrés", "Saldívar");
  const renata = await findCustomerByName("Renata", "Olvera");

  const [reservationForSofia] = await db
    .select()
    .from(productReservations)
    .where(
      and(
        eq(productReservations.customerId, sofia.id),
        eq(productReservations.status, "held"),
      ),
    )
    .limit(1);

  await db.insert(approvalRequests).values([
    // 1. Long reservation (>7 days) raised by Ana for Sofía VIP
    {
      type: "reservation_long",
      status: "pending",
      storeId: store.id,
      brandId: brand.id,
      customerId: sofia.id,
      requestedByUserId: ba1.id,
      reason:
        "Sofía viaja por trabajo, regresa el 5 de junio. Pide hold extendido.",
      payload: {
        productReservationId: reservationForSofia?.id ?? null,
        currentHoldUntil: reservationForSofia?.holdUntil ?? null,
        requestedHoldUntil: new Date(
          today.getTime() + 10 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        productHint: "Touche Éclat + Libre EDP 90ml",
      },
    },
    // 2. Special discount raised by Emiliano for Andrés VIP
    {
      type: "discount_special",
      status: "pending",
      storeId: store.id,
      brandId: brand.id,
      customerId: andres.id,
      requestedByUserId: ba2.id,
      reason:
        "Cliente platinum, viene por compra alta. Quiere descuento de cortesía 10%.",
      payload: {
        discountPct: 10,
        estimatedTicket: 8500,
        justification: "Cliente recurrente con LTV alta",
      },
    },
    // 3. Return outside policy raised by Ana
    {
      type: "return",
      status: "pending",
      storeId: store.id,
      brandId: brand.id,
      customerId: renata.id,
      requestedByUserId: ba1.id,
      reason: "Clienta abrió producto pero le dio reacción alérgica.",
      payload: {
        orderHint: "Compra del 18 de mayo",
        items: [{ sku: "YSL-LIBRE-50ML", quantity: 1, reason: "alergia" }],
      },
    },
    // 4. Already-decided approval (approved) so the dashboard inbox can show
    //    "resolved today" history.
    {
      type: "vip_profile_change",
      status: "approved",
      storeId: store.id,
      brandId: brand.id,
      customerId: sofia.id,
      requestedByUserId: ba1.id,
      decidedByUserId: ctx.counterManager.id,
      reason: "Cambio de tier de gold a platinum tras compra del mes.",
      decisionNotes: "OK con base en LTV últimos 90 días.",
      payload: { field: "loyaltyTier", from: "gold", to: "platinum" },
      decidedAt: new Date(today.getTime() - 2 * 60 * 60 * 1000),
    },
  ]);

  console.log(
    "  ✓ approval_requests: 4 rows (3 pending + 1 approved historical)",
  );
}

async function seedBaRatings(ctx: Awaited<ReturnType<typeof resolve>>) {
  const { store, ba1, ba2 } = ctx;

  await db.delete(baRatings).where(eq(baRatings.storeId, store.id));

  // Resolve customers (3 per BA)
  const ana_clients = [
    await findCustomerByName("Sofía", "Mendoza"),
    await findCustomerByName("Renata", "Olvera"),
    await findCustomerByName("Valeria", "Treviño"),
    await findCustomerByName("Camila", "Reyes"),
  ];
  const emiliano_clients = [
    await findCustomerByName("Andrés", "Saldívar"),
    await findCustomerByName("Mariana", "Gómez"),
    await findCustomerByName("Daniela", "Quintero"),
    await findCustomerByName("Darío", "Mariscal"),
    await findCustomerByName("Patricio", "Lira"),
  ];

  // Ana NPS distribution: 3 promoters (10, 9, 9), 1 passive (8) → NPS = 75
  const anaScores = [10, 9, 9, 8];
  // Emiliano NPS distribution: 2 promoters (10, 9), 2 passives (8, 7),
  // 1 detractor (5) → NPS = (40 - 20) = 20
  const emilianoScores = [10, 9, 8, 7, 5];

  const rows: (typeof baRatings.$inferInsert)[] = [];

  anaScores.forEach((score, i) => {
    rows.push({
      reviewedUserId: ba1.id,
      customerId: ana_clients[i].id,
      storeId: store.id,
      score,
      comment:
        score >= 9
          ? "Excelente atención, muy recomendada"
          : score >= 7
            ? "Buena atención, volveré"
            : "Atención correcta",
      source: "post_visit_survey",
      submittedByUserId: null,
      createdAt: new Date(
        today.getTime() - (i + 1) * 2 * 24 * 60 * 60 * 1000,
      ),
    });
  });

  emilianoScores.forEach((score, i) => {
    rows.push({
      reviewedUserId: ba2.id,
      customerId: emiliano_clients[i].id,
      storeId: store.id,
      score,
      comment:
        score >= 9
          ? "Increíble experiencia, gracias!"
          : score >= 7
            ? "Buen servicio"
            : score === 5
              ? "Esperaba más asesoría de fragancia"
              : "Regular",
      source:
        i % 2 === 0 ? "post_visit_survey" : ("whatsapp_survey" as const),
      submittedByUserId: null,
      createdAt: new Date(
        today.getTime() - (i + 1) * 1.5 * 24 * 60 * 60 * 1000,
      ),
    });
  });

  await db.insert(baRatings).values(rows);
  console.log(
    `  ✓ ba_ratings: ${rows.length} rows (Ana NPS≈75, Emiliano NPS≈20)`,
  );
}

async function seedEventAssignments(
  ctx: Awaited<ReturnType<typeof resolve>>,
) {
  const { store, counterManager, ba1, ba2 } = ctx;

  // Find the upcoming masterclass at Santa Fe to staff.
  const [upcomingEvent] = await db
    .select()
    .from(storeEvents)
    .where(
      and(
        eq(storeEvents.storeId, store.id),
        eq(storeEvents.status, "scheduled"),
      ),
    )
    .limit(1);

  if (!upcomingEvent) {
    console.log("  ⚠ no scheduled event in Santa Fe — skipping assignments");
    return;
  }

  await db
    .delete(eventAssignments)
    .where(eq(eventAssignments.storeEventId, upcomingEvent.id));

  await db.insert(eventAssignments).values([
    {
      storeEventId: upcomingEvent.id,
      userId: counterManager.id,
      role: "lead",
      assignedByUserId: counterManager.id,
    },
    {
      storeEventId: upcomingEvent.id,
      userId: ba1.id,
      role: "host",
      assignedByUserId: counterManager.id,
    },
    {
      storeEventId: upcomingEvent.id,
      userId: ba2.id,
      role: "staff",
      assignedByUserId: counterManager.id,
    },
  ]);

  console.log(
    `  ✓ event_assignments: 3 rows for "${upcomingEvent.name}" (lead + host + staff)`,
  );
}

async function findCustomerByName(firstName: string, lastName: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.firstName, firstName),
        eq(customers.lastName, lastName),
      ),
    );
  if (!customer) {
    throw new Error(`Customer ${firstName} ${lastName} not found`);
  }
  return customer;
}

async function main() {
  console.log("🌱 Seeding Counter Manager data for Juan Perez @ YSL Santa Fe\n");

  const ctx = await resolve();
  console.log(
    `  · Store: ${ctx.store.displayName} (${ctx.store.code})\n  · Brand: ${ctx.brand.displayName}\n  · Counter Manager: ${ctx.counterManager.fullName}\n  · Team: ${ctx.ba1.fullName}, ${ctx.ba2.fullName}\n`,
  );

  await seedSalesTargets(ctx);
  await seedShifts(ctx);
  await seedApprovalRequests(ctx);
  await seedBaRatings(ctx);
  await seedEventAssignments(ctx);

  console.log("\n✅ Counter Manager seed complete.\n");
  await pool.end();
}

main().catch((err) => {
  console.error("✗ Counter Manager seed failed:", err);
  pool.end();
  process.exit(1);
});
