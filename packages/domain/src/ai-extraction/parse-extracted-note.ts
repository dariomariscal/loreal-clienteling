import { ExtractedNoteSchema, type ExtractedNote } from "@loreal/contracts";

export interface ParseExtractedNoteResult {
  ok: boolean;
  data?: ExtractedNote;
  error?: string;
}

/**
 * Validate and normalize the JSON payload returned by the LLM after a
 * note-extraction prompt. Pure function — no LLM, no DB. The service layer
 * calls this immediately after receiving the model's output.
 *
 * If the LLM wrapped the JSON in a code fence (```json ... ```), the wrapper
 * is stripped before parsing.
 */
export function parseExtractedNote(raw: string): ParseExtractedNoteResult {
  const cleaned = stripCodeFence(raw).trim();
  if (!cleaned) {
    return { ok: false, error: "Empty response" };
  }
  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch (err) {
    return {
      ok: false,
      error: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  const result = ExtractedNoteSchema.safeParse(json);
  if (!result.success) {
    return { ok: false, error: result.error.message };
  }
  return { ok: true, data: result.data };
}

function stripCodeFence(text: string): string {
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/m;
  const match = text.trim().match(fence);
  return match ? match[1] : text;
}
