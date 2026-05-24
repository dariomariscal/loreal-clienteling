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

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  ingredients: string[] | null;
  sales_argument: string | null;
};

function buildEmbeddingInput(p: ProductRow): string {
  const ingredients = p.ingredients?.length
    ? `Ingredientes: ${p.ingredients.join(", ")}.`
    : "";
  return [
    `${p.name} (SKU ${p.sku}).`,
    `Categoría: ${p.category}${p.subcategory ? ` / ${p.subcategory}` : ""}.`,
    p.description ?? "",
    p.sales_argument ?? "",
    ingredients,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function toNeonDirectUrl(raw: string): string {
  if (!raw.includes("neon.tech")) return raw;
  let url = raw.replace("-pooler", "");
  const parsed = new URL(url);
  parsed.searchParams.delete("channel_binding");
  if (!parsed.searchParams.get("sslmode")) {
    parsed.searchParams.set("sslmode", "require");
  }
  return parsed.toString();
}

async function main() {
  const onlyMissing = !process.argv.includes("--all");
  const databaseUrl = toNeonDirectUrl(process.env.DATABASE_URL!);
  const host = new URL(databaseUrl).host;
  console.log(`→ Target DB: ${host}`);
  console.log(`→ Mode: ${onlyMissing ? "only missing" : "all products"}`);
  console.log(`→ Model: ${MODEL}`);

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const { rows: products } = await pool.query<ProductRow>(
      onlyMissing
        ? `SELECT p.id, p.sku, p.name, p.category, p.subcategory,
                  p.description, p.ingredients, p.sales_argument
             FROM products p
             LEFT JOIN product_embeddings pe ON pe.product_id = p.id
            WHERE p.active = true AND pe.product_id IS NULL
            ORDER BY p.sku`
        : `SELECT id, sku, name, category, subcategory,
                  description, ingredients, sales_argument
             FROM products
            WHERE active = true
            ORDER BY sku`,
    );

    if (products.length === 0) {
      console.log("✓ Nothing to backfill.");
      return;
    }

    console.log(`→ ${products.length} product(s) to embed`);

    let totalTokens = 0;
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
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
          const product = batch[j];
          const vector = sorted[j].embedding;
          const literal = `[${vector.join(",")}]`;
          await client.query(
            `INSERT INTO product_embeddings (product_id, embedding, model)
                 VALUES ($1, $2::vector, $3)
             ON CONFLICT (product_id) DO UPDATE
                SET embedding = EXCLUDED.embedding,
                    model = EXCLUDED.model,
                    generated_at = now()`,
            [product.id, literal, MODEL],
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

    // text-embedding-3-small is $0.02 per 1M tokens.
    const costUsd = (totalTokens / 1_000_000) * 0.02;
    console.log(
      `✓ Done. ${products.length} embeddings written, ${totalTokens} tokens, ≈ $${costUsd.toFixed(6)}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("✗ Backfill failed:", err);
  process.exit(1);
});
