import type { NoteExtractionInput } from "@loreal/contracts";

export const NOTE_EXTRACTION_PROMPT_VERSION = "v1";

export interface NoteExtractionPrompt {
  system: string;
  user: string;
  promptVersion: string;
}

const SYSTEM_PROMPT = `Eres un asistente que estructura notas dictadas o escritas por consultoras de belleza sobre sus clientas.

Tu salida debe ser SOLO JSON válido conforme al esquema dado. Sin texto antes ni después.

Reglas:
- "bodyClean": reescribe la nota para que sea clara y legible, conservando hechos, opiniones y matices. No inventes ni interpretes intenciones. Si la nota original era clara, déjala casi igual.
- "preferences": gustos concretos (tonos, acabados, marcas, texturas). Solo si se mencionan.
- "allergies": ingredientes o fragancias que causan rechazo. Solo si se mencionan.
- "productsMentioned": nombres específicos de productos o categorías ("labial rojo mate").
- "lifeEvents": cumpleaños, bodas, aniversarios. Incluye fecha como texto libre si aparece.
- "followUp": si la nota implica seguimiento, sugiere días y motivo.
- "sentiment": positive / neutral / negative según el tono global.

Si un campo no aplica, omítelo. No fuerces datos que no están.`;

export function buildNoteExtractionPrompt(
  input: NoteExtractionInput,
): NoteExtractionPrompt {
  const lines: string[] = [];

  if (input.customerFirstName) {
    lines.push(`Clienta: ${input.customerFirstName}`);
  }
  if (input.language) {
    lines.push(`Idioma original: ${input.language}`);
  }
  lines.push("");
  lines.push("Nota original:");
  lines.push(input.rawText.trim());
  lines.push("");
  lines.push("Devuelve el JSON conforme al esquema. Sin texto adicional.");

  return {
    system: SYSTEM_PROMPT,
    user: lines.join("\n"),
    promptVersion: NOTE_EXTRACTION_PROMPT_VERSION,
  };
}
