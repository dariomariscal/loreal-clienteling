import type * as React from "react";
import {
  ShadeFoundationGlyph,
  ShadeConcealerGlyph,
  ShadeLipstickGlyph,
  ShadeBlushGlyph,
} from "@/components/ui/glyphs";

export type GlyphComponent = React.ComponentType<{ className?: string }>;

export const CATEGORIES: ReadonlyArray<{
  value: string;
  label: string;
  Glyph: GlyphComponent;
}> = [
  { value: "foundation", label: "Base", Glyph: ShadeFoundationGlyph },
  { value: "concealer", label: "Corrector", Glyph: ShadeConcealerGlyph },
  { value: "lipstick", label: "Labial", Glyph: ShadeLipstickGlyph },
  { value: "blush", label: "Rubor", Glyph: ShadeBlushGlyph },
];

export type StepKey = "category" | "product" | "shade";

export interface ShadeOption {
  code: string;
  hex?: string;
}

// Backend stores shadeOptions as flexible JSON. Two shapes accepted:
//   { shades: ["N1", "N2"] }                       → swatches without color
//   { shades: [{ code: "N1", hex: "#E2BC9A" }] }   → swatches with color
// Anything else returns [] so the free-text input takes over.
export function parseShadeOptions(raw: unknown): ShadeOption[] {
  if (!raw || typeof raw !== "object") return [];
  const shades = (raw as Record<string, unknown>).shades;
  if (!Array.isArray(shades)) return [];
  return shades
    .map((s) => {
      if (typeof s === "string") return { code: s };
      if (s && typeof s === "object") {
        const code = (s as Record<string, unknown>).code;
        const hex = (s as Record<string, unknown>).hex;
        if (typeof code === "string") {
          return { code, hex: typeof hex === "string" ? hex : undefined };
        }
      }
      return null;
    })
    .filter((s): s is ShadeOption => !!s);
}
