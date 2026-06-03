import type * as React from "react";
import {
  SkinDryGlyph,
  SkinOilyGlyph,
  SkinCombinationGlyph,
  SkinSensitiveGlyph,
  SkinNormalGlyph,
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

export type LabeledGlyph = {
  value: string;
  label: string;
  Glyph: GlyphComponent;
};

export const SKIN_TYPES: ReadonlyArray<{
  value: string;
  label: string;
  description: string;
  Glyph: GlyphComponent;
}> = [
  {
    value: "dry",
    label: "Seca",
    description: "Se siente tirante, escamosa o áspera",
    Glyph: SkinDryGlyph,
  },
  {
    value: "oily",
    label: "Grasa",
    description: "Brillo y poros visibles, especialmente en zona T",
    Glyph: SkinOilyGlyph,
  },
  {
    value: "combination",
    label: "Mixta",
    description: "Zona T grasa, mejillas normales o secas",
    Glyph: SkinCombinationGlyph,
  },
  {
    value: "sensitive",
    label: "Sensible",
    description: "Se enrojece, irrita o reacciona con facilidad",
    Glyph: SkinSensitiveGlyph,
  },
  {
    value: "normal",
    label: "Normal",
    description: "Equilibrada, sin extremos",
    Glyph: SkinNormalGlyph,
  },
];

export const SKIN_TONES = [
  { value: "fair", label: "Clara", swatch: "#F2D7C3" },
  { value: "light", label: "Ligera", swatch: "#E2BC9A" },
  { value: "medium", label: "Media", swatch: "#C99772" },
  { value: "tan", label: "Morena", swatch: "#A06F4E" },
  { value: "deep", label: "Oscura", swatch: "#5C3823" },
] as const;

export const SKIN_SUBTONES = [
  {
    value: "cool",
    label: "Frío",
    swatch: "linear-gradient(135deg, #F6C5C5 0%, #D9A8C7 100%)",
    hint: "Las venas se ven azules o moradas. La plata favorece más que el oro.",
  },
  {
    value: "neutral",
    label: "Neutro",
    swatch: "linear-gradient(135deg, #E8C8AC 0%, #C7A98E 100%)",
    hint: "Mezcla de azules y verdes. Tanto la plata como el oro funcionan.",
  },
  {
    value: "warm",
    label: "Cálido",
    swatch: "linear-gradient(135deg, #F3D49B 0%, #D9A66B 100%)",
    hint: "Las venas se ven verdosas. El oro favorece más que la plata.",
  },
] as const;

export const SKIN_CONCERNS: ReadonlyArray<LabeledGlyph> = [
  { value: "acne", label: "Acné", Glyph: ConcernAcneGlyph },
  { value: "aging", label: "Anti-edad", Glyph: ConcernAgingGlyph },
  { value: "pigmentation", label: "Pigmentación", Glyph: ConcernPigmentationGlyph },
  { value: "dryness", label: "Hidratación", Glyph: ConcernDrynessGlyph },
  { value: "sensitivity", label: "Sensibilidad", Glyph: ConcernSensitivityGlyph },
  { value: "pores", label: "Poros", Glyph: ConcernPoresGlyph },
  { value: "dark_circles", label: "Ojeras", Glyph: ConcernDarkCirclesGlyph },
  { value: "redness", label: "Rojeces", Glyph: ConcernRednessGlyph },
];

export const FRAGRANCES: ReadonlyArray<LabeledGlyph> = [
  { value: "floral", label: "Floral", Glyph: FragranceFloralGlyph },
  { value: "woody", label: "Amaderada", Glyph: FragranceWoodyGlyph },
  { value: "citrus", label: "Cítrica", Glyph: FragranceCitrusGlyph },
  { value: "oriental", label: "Oriental", Glyph: FragranceOrientalGlyph },
  { value: "fresh", label: "Fresca", Glyph: FragranceFreshGlyph },
  { value: "gourmand", label: "Gourmand", Glyph: FragranceGourmandGlyph },
];

export const ROUTINE_TYPES: ReadonlyArray<LabeledGlyph> = [
  { value: "morning", label: "Sólo AM", Glyph: RoutineMorningGlyph },
  { value: "night", label: "Sólo PM", Glyph: RoutineNightGlyph },
  { value: "both", label: "AM + PM", Glyph: RoutineBothGlyph },
];

export const INTERESTS: ReadonlyArray<LabeledGlyph> = [
  { value: "skincare", label: "Skincare", Glyph: InterestSkincareGlyph },
  { value: "makeup", label: "Maquillaje", Glyph: InterestMakeupGlyph },
  { value: "fragrance", label: "Fragancia", Glyph: InterestFragranceGlyph },
];

export const COMMON_PREFERRED = [
  "retinol",
  "niacinamida",
  "ácido hialurónico",
  "vitamina C",
  "péptidos",
  "AHA",
  "BHA",
  "ceramidas",
];

export const COMMON_AVOIDED = [
  "alcohol",
  "parabenos",
  "sulfatos",
  "fragancia",
  "siliconas",
  "ácido salicílico",
];

export type StepKey =
  | "type"
  | "tone"
  | "subtone"
  | "concerns"
  | "preferences";

export const STEPS: { key: StepKey; label: string }[] = [
  { key: "type", label: "Tipo de piel" },
  { key: "tone", label: "Tono" },
  { key: "subtone", label: "Subtono" },
  { key: "concerns", label: "Preocupaciones" },
  { key: "preferences", label: "Preferencias" },
];
