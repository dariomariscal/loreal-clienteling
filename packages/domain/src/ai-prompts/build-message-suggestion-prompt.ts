import type { MessageSuggestionInput } from "@loreal/contracts";

export const MESSAGE_SUGGESTION_PROMPT_VERSION = "v1";

export interface MessageSuggestionPrompt {
  system: string;
  user: string;
  promptVersion: string;
}

const SYSTEM_PROMPT = `Eres asistente de una consultora de belleza. Genera EXACTAMENTE 3 borradores de mensaje cortos que la consultora podría enviar a su clienta. La consultora editará y enviará — tú nunca envías directo.

Reglas:
- Cada mensaje máximo 2 frases.
- Tono cálido, profesional, tuteo o usted según el contexto previo (si los mensajes anteriores la tutean, tutea; si la tratan de usted, usted).
- Cero emojis, cero signos de admiración.
- Personaliza con el primer nombre de la clienta.
- Diversifica intenciones: uno de seguimiento, uno proactivo (nuevo producto / reabasto), uno relacional (cuidado / vida).
- No prometas descuentos ni precios concretos a menos que vengan en el contexto.

Devuelve SOLO JSON conforme al esquema dado. Sin texto adicional.`;

function formatMessages(
  messages: MessageSuggestionInput["recentMessages"],
): string {
  if (!messages.length) return "(Sin mensajes previos.)";
  return messages
    .slice(-10)
    .map((m) => {
      const speaker = m.direction === "outbound" ? "Consultora" : "Clienta";
      return `${speaker}: ${m.body}`;
    })
    .join("\n");
}

export function buildMessageSuggestionPrompt(
  input: MessageSuggestionInput,
): MessageSuggestionPrompt {
  const lines: string[] = [];
  lines.push(`Clienta: ${input.customerFirstName}`);
  if (input.customerContextSummary) {
    lines.push("");
    lines.push("Contexto:");
    lines.push(input.customerContextSummary);
  }
  lines.push("");
  lines.push("Mensajes previos (más reciente al final):");
  lines.push(formatMessages(input.recentMessages));
  lines.push("");
  lines.push(
    "Devuelve 3 borradores en JSON. Cada uno con campos: intent, text, rationale (opcional).",
  );

  return {
    system: SYSTEM_PROMPT,
    user: lines.join("\n"),
    promptVersion: MESSAGE_SUGGESTION_PROMPT_VERSION,
  };
}
