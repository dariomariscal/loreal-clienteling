import type { CustomerSummaryContext } from "@loreal/contracts";

/** Bumped whenever the rules below change in a way that invalidates cache. */
export const CUSTOMER_SUMMARY_PROMPT_VERSION = "v1";

export interface CustomerSummaryPrompt {
  system: string;
  user: string;
  promptVersion: string;
}

const SYSTEM_PROMPT = `Eres asistente de una consultora de belleza en piso de venta. Tu trabajo es producir un resumen muy breve (máximo 3 frases) de una clienta para que la consultora pueda atenderla de inmediato.

Reglas absolutas:
- Máximo 3 frases. Cero relleno. Cero saludos.
- Habla en español neutro, tono profesional y cálido (no formal, no infantil).
- Empieza con lo que más importa hoy (probable reabasto, fecha relevante próxima, preferencia clave).
- Menciona alergias o sensibilidades solo si están registradas — no inventes.
- Nunca uses signos de admiración ni emojis.
- Nunca uses la palabra "cliente" ni "usuario" — di "clienta" o su primer nombre.
- Si falta información, omite — nunca digas "no hay datos suficientes".`;

function formatRecentOrders(
  orders: CustomerSummaryContext["recentOrders"],
): string {
  if (!orders.length) return "Sin compras registradas.";
  return orders
    .map(
      (o) => `- ${o.productTitle} (hace ${o.daysAgo} días, $${o.price.toFixed(0)})`,
    )
    .join("\n");
}

function formatRecentNotes(
  notes: CustomerSummaryContext["recentNotes"],
): string {
  if (!notes.length) return "Sin notas previas.";
  return notes
    .slice(0, 5)
    .map((n) => `- (hace ${n.daysAgo} días) ${n.body}`)
    .join("\n");
}

/**
 * Pure prompt builder. Takes the structured context the API service collected
 * and emits the system+user payload to ship to the LLM. No side effects, no
 * network — testable in isolation.
 */
export function buildCustomerSummaryPrompt(
  context: CustomerSummaryContext,
): CustomerSummaryPrompt {
  const fullName = `${context.firstName} ${context.lastName}`.trim();
  const lines: string[] = [];

  lines.push(`Clienta: ${fullName}`);
  if (context.ageYears) lines.push(`Edad: ${context.ageYears} años`);
  lines.push(`Etapa: ${context.lifecycleStage}`);
  lines.push(
    `Clienta desde: ${context.enrolledAt.toISOString().slice(0, 10)}`,
  );
  if (context.lastVisitDaysAgo !== undefined) {
    lines.push(`Última visita: hace ${context.lastVisitDaysAgo} días`);
  }
  if (context.averageOrderIntervalDays !== undefined) {
    lines.push(
      `Intervalo promedio entre compras: ${context.averageOrderIntervalDays} días`,
    );
  }
  if (context.knownPreferences?.length) {
    lines.push(`Preferencias conocidas: ${context.knownPreferences.join(", ")}`);
  }
  if (context.knownAllergies?.length) {
    lines.push(`Alergias / sensibilidades: ${context.knownAllergies.join(", ")}`);
  }
  if (context.upcomingAppointment) {
    lines.push(
      `Próxima cita: ${context.upcomingAppointment.whenIso}${
        context.upcomingAppointment.location
          ? ` en ${context.upcomingAppointment.location}`
          : ""
      }`,
    );
  }
  lines.push("");
  lines.push("Compras recientes:");
  lines.push(formatRecentOrders(context.recentOrders));
  lines.push("");
  lines.push("Notas recientes:");
  lines.push(formatRecentNotes(context.recentNotes));
  lines.push("");
  lines.push("Escribe ahora el resumen de máximo 3 frases.");

  return {
    system: SYSTEM_PROMPT,
    user: lines.join("\n"),
    promptVersion: CUSTOMER_SUMMARY_PROMPT_VERSION,
  };
}
