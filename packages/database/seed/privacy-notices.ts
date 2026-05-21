import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and } from "drizzle-orm";
import { privacyNotices } from "../schema";

// Mirror migrate.ts: only fall back to apps/api/.env when DATABASE_URL is unset.
// An explicit `DATABASE_URL=... pnpm seed:...` must always win.
if (!process.env.DATABASE_URL) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { config } = require("dotenv") as typeof import("dotenv");
    config({ path: path.resolve(__dirname, "../../../apps/api/.env") });
  } catch {
    // dotenv not installed — relying on process.env.
  }
}

// Neon publishes a pooled URL by default, but pooled connections drop the
// session-level state these seed scripts assume. Always route to the direct
// endpoint when we detect Neon.
function resolveUrl(raw: string): string {
  if (!raw.includes("neon.tech")) return raw;
  const url = new URL(raw.replace("-pooler", ""));
  url.searchParams.delete("channel_binding");
  if (!url.searchParams.get("sslmode")) {
    url.searchParams.set("sslmode", "require");
  }
  return url.toString();
}

const connectionString = resolveUrl(
  process.env.DATABASE_URL ??
    "postgresql://loreal:loreal@localhost:5433/loreal_clienteling",
);
const pool = new Pool({ connectionString });
const db = drizzle(pool);

const INITIAL_VERSION = "1.0";
const INITIAL_LANGUAGE = "es-MX";

const INITIAL_BODY = `# Aviso de Privacidad

L'Oréal México, S.A. de C.V. ("L'Oréal"), con domicilio en Ciudad de México,
es responsable del tratamiento de sus datos personales conforme a la Ley
Federal de Protección de Datos Personales en Posesión de los Particulares
(LFPDPPP).

## Datos que recabamos
Nombre, fecha de nacimiento, género, correo electrónico, número de teléfono,
preferencias de belleza, historial de compras y de interacciones con nuestros
Beauty Advisors.

## Finalidades
- Brindarle asesoría personalizada de productos y servicios de belleza.
- Registrar y dar seguimiento a sus compras, citas y recomendaciones.
- Enviarle comunicaciones de marketing por los canales que usted autorice
  (correo electrónico, SMS, WhatsApp). Cada canal requiere su consentimiento
  expreso y puede revocarse en cualquier momento.

## Derechos ARCO
Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al
tratamiento de sus datos, así como a revocar su consentimiento. Para
ejercerlos, escriba a privacidad.mx@loreal.com.

## Transferencias
Sus datos pueden ser compartidos con marcas del portafolio L'Oréal y con
proveedores que apoyan la operación del programa, siempre bajo obligaciones
de confidencialidad equivalentes.

## Vigencia y cambios
Este aviso puede ser actualizado. La versión vigente estará disponible en
todo momento en el punto de venta y en loreal.com.mx/privacidad.

Versión 1.0 — Vigente desde mayo de 2026.`;

async function seed() {
  console.log(`🌱 Seeding privacy notices against ${new URL(connectionString).host}...`);

  const [existing] = await db
    .select()
    .from(privacyNotices)
    .where(
      and(
        eq(privacyNotices.version, INITIAL_VERSION),
        eq(privacyNotices.language, INITIAL_LANGUAGE),
      ),
    );

  if (existing) {
    console.log(`  Privacy notice v${INITIAL_VERSION} (${INITIAL_LANGUAGE}) already seeded.`);
  } else {
    await db.insert(privacyNotices).values({
      version: INITIAL_VERSION,
      language: INITIAL_LANGUAGE,
      title: "Aviso de Privacidad L'Oréal México",
      bodyMarkdown: INITIAL_BODY,
    });
    console.log(`  ✅ Inserted privacy notice v${INITIAL_VERSION} (${INITIAL_LANGUAGE}).`);
  }

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  pool.end();
  process.exit(1);
});
