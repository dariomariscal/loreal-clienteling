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

type CustomerRow = {
  id: string;
  first_name: string;
  last_name: string;
  gender: string | null;
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
  recent_notes: string[] | null;
  bought_skus: string[] | null;
};

function buildEmbeddingInput(c: CustomerRow): string {
  const skin = [c.skin_type, c.skin_tone, c.undertone].filter(Boolean).join(" / ");
  const concerns = c.skin_concerns?.length ? `Preocupaciones: ${c.skin_concerns.join(", ")}.` : "";
  const prefers = c.preferred_ingredients?.length ? `Prefiere: ${c.preferred_ingredients.join(", ")}.` : "";
  const avoids = c.avoided_ingredients?.length ? `Evita: ${c.avoided_ingredients.join(", ")}.` : "";
  const fragrances = c.fragrance_families?.length ? `Familias olfativas: ${c.fragrance_families.join(", ")}.` : "";
  const interests = c.interests?.length ? `Intereses: ${c.interests.join(", ")}.` : "";
  const notes = c.recent_notes?.length ? `Notas BA: ${c.recent_notes.join(" | ")}` : "";
  const bought = c.bought_skus?.length ? `Compras previas: ${c.bought_skus.join(", ")}.` : "";

  return [
    `${c.first_name} ${c.last_name}.`,
    c.gender ? `Género: ${c.gender}.` : "",
    `Stage: ${c.lifecycle_stage}${c.loyalty_tier ? ` (${c.loyalty_tier})` : ""}.`,
    skin ? `Piel: ${skin}.` : "",
    c.hair_type ? `Cabello: ${c.hair_type}.` : "",
    concerns, prefers, avoids, fragrances, interests, bought, notes,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const onlyMissing = !process.argv.includes("--all");
  console.log(`→ Mode: ${onlyMissing ? "only missing" : "all customers"}`);
  console.log(`→ Model: ${MODEL}`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 1 });
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const baseSql = `
      SELECT
        c.id, c.first_name, c.last_name, c.gender,
        c.lifecycle_stage, c.loyalty_tier,
        bp.skin_type, bp.skin_tone, bp.undertone, bp.hair_type,
        COALESCE(bp.skin_concerns, '[]'::jsonb)::text::json AS skin_concerns,
        COALESCE(bp.preferred_ingredients, '[]'::jsonb)::text::json AS preferred_ingredients,
        COALESCE(bp.avoided_ingredients, '[]'::jsonb)::text::json AS avoided_ingredients,
        COALESCE(bp.fragrance_families, '[]'::jsonb)::text::json AS fragrance_families,
        COALESCE(bp.interests, '[]'::jsonb)::text::json AS interests,
        ARRAY(
          SELECT n.body FROM notes n
          WHERE n.customer_id = c.id ORDER BY n.created_at DESC LIMIT 5
        ) AS recent_notes,
        ARRAY(
          SELECT DISTINCT li.sku FROM orders o
          JOIN line_items li ON li.order_id = o.id
          WHERE o.customer_id = c.id LIMIT 20
        ) AS bought_skus
      FROM customers c
      LEFT JOIN beauty_profiles bp ON bp.customer_id = c.id
    `;
    const whereMissing = `
      WHERE NOT EXISTS (SELECT 1 FROM customer_embeddings ce WHERE ce.customer_id = c.id)
    `;

    const { rows: customers } = await pool.query<CustomerRow>(
      onlyMissing ? `${baseSql} ${whereMissing} ORDER BY c.id` : `${baseSql} ORDER BY c.id`,
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
