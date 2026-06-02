import type { RecommendationReasonSignals } from "@loreal/contracts";

export const RECOMMENDATION_REASON_PROMPT_VERSION = "v1";

export interface RecommendationReasonPromptInput {
  customerFirstName: string;
  preferredLanguage: string;
  product: {
    title: string;
    brandName: string | null;
    talkingPoints: string | null;
    targetConcerns: string[];
  };
  customerContext: {
    skinConcerns: string[];
    avoidedIngredients: string[];
    lastPurchasedTitles: string[];
  };
  signals: RecommendationReasonSignals;
}

export interface RecommendationReasonPrompt {
  system: string;
  user: string;
  promptVersion: string;
}

const SYSTEM_PROMPT = `Eres asistente de una consultora de belleza. Recibes una recomendación de producto producida por un motor y debes generar EXACTAMENTE dos textos en formato JSON:

1. "rationale": una sola frase, máximo 25 palabras, dirigida a la consultora, en español neutro, explicando POR QUÉ este producto es relevante para esta clienta. Cita la señal más fuerte (reposición, afinidad de piel, marca preferida) con un dato concreto.
2. "messageDraft": un mensaje corto (1-2 frases) que la consultora podría enviarle a la clienta por WhatsApp en el idioma indicado. Tono cálido, profesional, sin emojis, sin signos de admiración, sin prometer descuentos.

Reglas:
- No inventes ingredientes ni propiedades que no estén en el contexto.
- Nunca uses "AI" o "inteligencia artificial" en los textos.
- Si la clienta tiene un ingrediente evitado, asegúrate de no mencionarlo.
- Si la señal principal es "replenishment_due" y hay días para agotarse, menciona ese plazo en el rationale.

Devuelve SOLO JSON: { "rationale": string, "messageDraft": string }.`;

function describeSignals(signals: RecommendationReasonSignals): string {
  const entries: string[] = [];
  if (signals.replenishmentDue !== undefined) {
    const days = signals.replenishmentDaysUntilDepletion;
    entries.push(
      `replenishment_due (score ${signals.replenishmentDue}${days !== undefined ? `, ${days}d hasta agotarse` : ""})`,
    );
  }
  if (signals.contentAffinity !== undefined) {
    entries.push(`content_affinity (score ${signals.contentAffinity})`);
  }
  if (signals.semanticMatch !== undefined) {
    entries.push(`semantic_match (score ${signals.semanticMatch})`);
  }
  if (signals.lookalikePurchase !== undefined) {
    entries.push(`lookalike_purchase (score ${signals.lookalikePurchase})`);
  }
  return entries.length ? entries.join(", ") : "(sin señales)";
}

export function buildRecommendationReasonPrompt(
  input: RecommendationReasonPromptInput,
): RecommendationReasonPrompt {
  const lines: string[] = [];
  lines.push(`Clienta: ${input.customerFirstName}`);
  lines.push(`Idioma del mensaje: ${input.preferredLanguage}`);
  lines.push("");
  lines.push(
    `Producto: ${input.product.title}${input.product.brandName ? ` — ${input.product.brandName}` : ""}`,
  );
  if (input.product.targetConcerns.length) {
    lines.push(
      `Trata: ${input.product.targetConcerns.join(", ")}`,
    );
  }
  if (input.product.talkingPoints) {
    lines.push(`Argumento de venta: ${input.product.talkingPoints}`);
  }
  lines.push("");
  lines.push("Contexto de la clienta:");
  if (input.customerContext.skinConcerns.length) {
    lines.push(
      `- Preocupaciones: ${input.customerContext.skinConcerns.join(", ")}`,
    );
  }
  if (input.customerContext.avoidedIngredients.length) {
    lines.push(
      `- Evita: ${input.customerContext.avoidedIngredients.join(", ")}`,
    );
  }
  if (input.customerContext.lastPurchasedTitles.length) {
    lines.push(
      `- Compras recientes: ${input.customerContext.lastPurchasedTitles.slice(0, 3).join("; ")}`,
    );
  }
  lines.push("");
  lines.push(`Señales del motor: ${describeSignals(input.signals)}`);
  lines.push("");
  lines.push('Devuelve JSON: { "rationale": ..., "messageDraft": ... }');

  return {
    system: SYSTEM_PROMPT,
    user: lines.join("\n"),
    promptVersion: RECOMMENDATION_REASON_PROMPT_VERSION,
  };
}
