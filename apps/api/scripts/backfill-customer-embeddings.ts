import path from "node:path";
import { Pool } from "pg";
import OpenAI from "openai";

if (!process.env.DATABASE_URL || !process.env.OPENAI_API_KEY) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { config } = require("dotenv") as typeof import("dotenv");
  config({ path: path.resolve(__dirname, "../.env") });
}

const MODEL =
  process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const BATCH_SIZE = 50;

/**
 * Mirrors the runtime `CustomerEmbeddingService` so backfill vectors are
 * byte-identical to those produced on write. If the service serialisation
 * changes, this builder MUST change in lockstep — otherwise the vector
 * space becomes inconsistent (same customer, two embeddings, different
 * sentences) and similarity scores get noisy.
 */
type CustomerRow = {
  id: string;
  first_name: string;
  last_name: string;
  lifecycle_stage: string;
  loyalty_tier: string | null;
  skin_type: string | null;
  skin_tone: string | null;
  undertone: string | null;
  hair_type: string | null;
  skin_concerns: string[] | null;
  preferred_ingredients: string[] | null;
  avoided_ingredients: string[] | null;
  fragrance_families: string[] | null;
  interests: string[] | null;
  recent_note_snippets: string[] | null;
  recent_product_titles: string[] | null;
  recent_visit_reasons: string[] | null;
};

const NOTE_SNIPPET_MAX = 200;

function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, max)}…`;
}

function buildEmbeddingInput(c: CustomerRow): string {
  const parts: string[] = [];
  parts.push(`Cliente: ${c.first_name} ${c.last_name}.`);
  parts.push(`Etapa: ${c.lifecycle_stage}.`);
  if (c.loyalty_tier) parts.push(`Lealtad: ${c.loyalty_tier}.`);

  if (c.skin_type) parts.push(`Piel: ${c.skin_type}.`);
  if (c.skin_tone) parts.push(`Tono: ${c.skin_tone}.`);
  if (c.undertone) parts.push(`Subtono: ${c.undertone}.`);
  if (c.skin_concerns?.length)
    parts.push(`Preocupaciones de piel: ${c.skin_concerns.join(", ")}.`);
  if (c.preferred_ingredients?.length)
    parts.push(`Ingredientes preferidos: ${c.preferred_ingredients.join(", ")}.`);
  if (c.avoided_ingredients?.length)
    parts.push(`Ingredientes evitados: ${c.avoided_ingredients.join(", ")}.`);
  if (c.hair_type) parts.push(`Cabello: ${c.hair_type}.`);
  if (c.fragrance_families?.length)
    parts.push(`Fragancias: ${c.fragrance_families.join(", ")}.`);
  if (c.interests?.length)
    parts.push(`Intereses: ${c.interests.join(", ")}.`);

  if (c.recent_product_titles?.length)
    parts.push(`Compras recientes: ${c.recent_product_titles.join("; ")}.`);
  if (c.recent_visit_reasons?.length)
    parts.push(`Motivos de visita: ${c.recent_visit_reasons.join(", ")}.`);
  if (c.recent_note_snippets?.length)
    parts.push(
      `Notas: ${c.recent_note_snippets.map((n) => truncate(n, NOTE_SNIPPET_MAX)).join(" | ")}.`,
    );

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function parseAssignedToFlag(argv: string[]): string[] | null {
  const flagIndex = argv.findIndex((a) => a === "--assigned-to");
  if (flagIndex === -1) return null;
  const value = argv[flagIndex + 1];
  if (!value) {
    throw new Error("--assigned-to requires a comma-separated user id list");
  }
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const onlyMissing = !process.argv.includes("--all");
  const assignedTo = parseAssignedToFlag(process.argv);
  console.log(`→ Mode: ${onlyMissing ? "only missing" : "all customers"}`);
  if (assignedTo) {
    console.log(`→ Restricted to ${assignedTo.length} BA(s): ${assignedTo.join(", ")}`);
  }
  console.log(`→ Model: ${MODEL}`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 1 });
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    // Lookback windows match the runtime service:
    //   - last 10 product titles within the last year
    //   - last 5 visit reasons (any age)
    //   - last 5 note bodies (any age)
    const baseSql = `
      SELECT
        c.id, c.first_name, c.last_name,
        c.lifecycle_stage, c.loyalty_tier,
        bp.skin_type, bp.skin_tone, bp.undertone, bp.hair_type,
        COALESCE(bp.skin_concerns, '[]'::jsonb)::text::json AS skin_concerns,
        COALESCE(bp.preferred_ingredients, '[]'::jsonb)::text::json AS preferred_ingredients,
        COALESCE(bp.avoided_ingredients, '[]'::jsonb)::text::json AS avoided_ingredients,
        COALESCE(bp.fragrance_families, '[]'::jsonb)::text::json AS fragrance_families,
        COALESCE(bp.interests, '[]'::jsonb)::text::json AS interests,
        ARRAY(
          SELECT n.body FROM notes n
          WHERE n.customer_id = c.id
          ORDER BY n.created_at DESC LIMIT 5
        ) AS recent_note_snippets,
        ARRAY(
          SELECT p.title
          FROM line_items li
          JOIN orders o ON o.id = li.order_id
          JOIN products p ON p.id = li.product_id
          WHERE o.customer_id = c.id
            AND o.processed_at >= NOW() - INTERVAL '365 days'
          ORDER BY o.processed_at DESC LIMIT 10
        ) AS recent_product_titles,
        ARRAY(
          SELECT cv.visit_reason FROM customer_visits cv
          WHERE cv.customer_id = c.id AND cv.visit_reason IS NOT NULL
          ORDER BY cv.started_at DESC LIMIT 5
        ) AS recent_visit_reasons
      FROM customers c
      LEFT JOIN beauty_profiles bp ON bp.customer_id = c.id
    `;
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (onlyMissing) {
      conditions.push(
        "NOT EXISTS (SELECT 1 FROM customer_embeddings ce WHERE ce.customer_id = c.id)",
      );
    }
    if (assignedTo && assignedTo.length > 0) {
      params.push(assignedTo);
      conditions.push(`c.assigned_to_user_id = ANY($${params.length}::text[])`);
    }
    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const { rows: customers } = await pool.query<CustomerRow>(
      `${baseSql} ${whereClause} ORDER BY c.id`,
      params,
    );

    if (customers.length === 0) {
      console.log("✓ Nothing to backfill.");
      return;
    }

    console.log(`→ ${customers.length} customer(s) to embed`);

    let totalTokens = 0;
    for (let i = 0; i < customers.length; i += BATCH_SIZE) {
      const batch = customers.slice(i, i + BATCH_SIZE);
      const inputs = batch.map(buildEmbeddingInput);

      const startedAt = Date.now();
      const response = await openai.embeddings.create({
        model: MODEL,
        input: inputs,
      });
      totalTokens += response.usage.total_tokens;

      const sorted = [...response.data].sort((a, b) => a.index - b.index);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (let j = 0; j < batch.length; j += 1) {
          const customer = batch[j];
          const vector = sorted[j].embedding;
          const literal = `[${vector.join(",")}]`;
          await client.query(
            `INSERT INTO customer_embeddings (customer_id, embedding, model)
                 VALUES ($1, $2::vector, $3)
             ON CONFLICT (customer_id) DO UPDATE
                SET embedding = EXCLUDED.embedding,
                    model = EXCLUDED.model,
                    generated_at = now()`,
            [customer.id, literal, MODEL],
          );
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }

      console.log(
        `  • batch ${i / BATCH_SIZE + 1}: ${batch.length} embedded in ${Date.now() - startedAt}ms`,
      );
    }

    const costUsd = (totalTokens / 1_000_000) * 0.02;
    console.log(
      `✓ Done. ${customers.length} embeddings written, ${totalTokens} tokens, ≈ $${costUsd.toFixed(6)}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("✗ Backfill failed:", err);
  process.exit(1);
});
