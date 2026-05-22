import type * as React from "react";
import {
  ConcernAcneGlyph,
  ConcernAgingGlyph,
  ConcernPigmentationGlyph,
  ConcernDrynessGlyph,
  ConcernSensitivityGlyph,
  ConcernPoresGlyph,
  ConcernDarkCirclesGlyph,
  ConcernRednessGlyph,
  FragranceFloralGlyph,
  FragranceWoodyGlyph,
  FragranceCitrusGlyph,
  FragranceOrientalGlyph,
  FragranceFreshGlyph,
  FragranceGourmandGlyph,
  RoutineMorningGlyph,
  RoutineNightGlyph,
  RoutineBothGlyph,
  InterestSkincareGlyph,
  InterestMakeupGlyph,
  InterestFragranceGlyph,
} from "@/components/ui/glyphs";

export type GlyphComponent = React.ComponentType<{ className?: string }>;

export const SKIN_TYPE_LABELS: Record<string, string> = {
  dry: "Seca",
  oily: "Grasa",
  combination: "Mixta",
  sensitive: "Sensible",
  normal: "Normal",
};

export const SKIN_TONE_LABELS: Record<string, string> = {
  fair: "Clara",
  light: "Ligera",
  medium: "Media",
  tan: "Morena",
  deep: "Oscura",
};

export const SKIN_TONE_SWATCH: Record<string, string> = {
  fair: "#F2D7C3",
  light: "#E2BC9A",
  medium: "#C99772",
  tan: "#A06F4E",
  deep: "#5C3823",
};

export const SUBTONE_LABELS: Record<string, string> = {
  cool: "Subtono frío",
  neutral: "Subtono neutro",
  warm: "Subtono cálido",
};

export const SUBTONE_GRADIENT: Record<string, string> = {
  cool: "linear-gradient(135deg, #F6C5C5 0%, #D9A8C7 100%)",
  neutral: "linear-gradient(135deg, #E8C8AC 0%, #C7A98E 100%)",
  warm: "linear-gradient(135deg, #F3D49B 0%, #D9A66B 100%)",
};

export const CONCERN_LABELS: Record<string, { label: string; Glyph: GlyphComponent }> = {
  acne: { label: "Acné", Glyph: ConcernAcneGlyph },
  aging: { label: "Anti-edad", Glyph: ConcernAgingGlyph },
  pigmentation: { label: "Pigmentación", Glyph: ConcernPigmentationGlyph },
  dryness: { label: "Hidratación", Glyph: ConcernDrynessGlyph },
  sensitivity: { label: "Sensibilidad", Glyph: ConcernSensitivityGlyph },
  pores: { label: "Poros", Glyph: ConcernPoresGlyph },
  dark_circles: { label: "Ojeras", Glyph: ConcernDarkCirclesGlyph },
  redness: { label: "Rojeces", Glyph: ConcernRednessGlyph },
};

export const FRAGRANCE_LABELS: Record<string, { label: string; Glyph: GlyphComponent }> = {
  floral: { label: "Floral", Glyph: FragranceFloralGlyph },
  woody: { label: "Amaderada", Glyph: FragranceWoodyGlyph },
  citrus: { label: "Cítrica", Glyph: FragranceCitrusGlyph },
  oriental: { label: "Oriental", Glyph: FragranceOrientalGlyph },
  fresh: { label: "Fresca", Glyph: FragranceFreshGlyph },
  gourmand: { label: "Gourmand", Glyph: FragranceGourmandGlyph },
};

export const ROUTINE_LABELS: Record<string, { label: string; Glyph: GlyphComponent }> = {
  morning: { label: "Rutina AM", Glyph: RoutineMorningGlyph },
  night: { label: "Rutina PM", Glyph: RoutineNightGlyph },
  both: { label: "AM + PM", Glyph: RoutineBothGlyph },
};

export const INTEREST_LABELS: Record<string, { label: string; Glyph: GlyphComponent }> = {
  skincare: { label: "Skincare", Glyph: InterestSkincareGlyph },
  makeup: { label: "Maquillaje", Glyph: InterestMakeupGlyph },
  fragrance: { label: "Fragancia", Glyph: InterestFragranceGlyph },
};

export const SHADE_CATEGORY_LABELS: Record<string, string> = {
  foundation: "Base",
  concealer: "Corrector",
  lipstick: "Labial",
  blush: "Rubor",
};

export function composeHeadline(profile: {
  skinType: string | null;
  skinTone: string | null;
}): string {
  const tone = profile.skinTone
    ? SKIN_TONE_LABELS[profile.skinTone] ?? profile.skinTone
    : null;
  const type = profile.skinType
    ? SKIN_TYPE_LABELS[profile.skinType] ?? profile.skinType
    : null;
  if (tone && type) return `Piel ${tone.toLowerCase()}, ${type.toLowerCase()}`;
  if (tone) return `Piel ${tone.toLowerCase()}`;
  if (type) return `Piel ${type.toLowerCase()}`;
  return "Perfil de belleza";
}

// Pull a hex from product.shadeOptions. Same contract as the shade picker:
// `{ shades: [{ code, hex }] }`. Anything else returns undefined.
export function extractHex(
  raw: unknown,
  shadeCode: string,
): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const shades = (raw as Record<string, unknown>).shades;
  if (!Array.isArray(shades)) return undefined;
  for (const s of shades) {
    if (s && typeof s === "object") {
      const code = (s as Record<string, unknown>).code;
      const hex = (s as Record<string, unknown>).hex;
      if (code === shadeCode && typeof hex === "string") return hex;
    }
  }
  return undefined;
}
