import { z } from "zod";

/**
 * Zod schema for the structured payload that the LLM must return when given
 * a free-form note (typed or transcribed). Single source of truth: the
 * backend validates LLM output against this, and the frontend infers types
 * from it via `z.infer`.
 *
 * Fields are intentionally all optional except `bodyClean` — a poorly
 * dictated note should still produce a usable note even if no preferences
 * could be extracted.
 */
export const ExtractedNoteSchema = z.object({
  bodyClean: z
    .string()
    .min(1)
    .describe("The note re-written for clarity, preserving meaning."),
  preferences: z
    .array(z.string())
    .optional()
    .describe("Product preferences, tones, finishes, brands the customer likes."),
  allergies: z
    .array(z.string())
    .optional()
    .describe("Ingredients or fragrances the customer cannot tolerate."),
  productsMentioned: z
    .array(z.string())
    .optional()
    .describe("Specific product names or SKUs referenced in the note."),
  lifeEvents: z
    .array(
      z.object({
        kind: z.string(),
        whenText: z.string().optional(),
      }),
    )
    .optional()
    .describe("Birthdays, anniversaries, weddings, etc. mentioned by the customer."),
  followUp: z
    .object({
      suggestedInDays: z.number().int().positive().optional(),
      reason: z.string().optional(),
    })
    .optional()
    .describe("If a follow-up is implied, when and why."),
  sentiment: z
    .enum(["positive", "neutral", "negative"])
    .optional()
    .describe("Overall sentiment expressed by the customer."),
});

export type ExtractedNote = z.infer<typeof ExtractedNoteSchema>;

export interface NoteExtractionInput {
  rawText: string;
  customerFirstName?: string;
  language?: string;
}
