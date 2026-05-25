export const SkinType = {
  DRY: "dry",
  OILY: "oily",
  COMBINATION: "combination",
  SENSITIVE: "sensitive",
  NORMAL: "normal",
} as const;

export type SkinType = (typeof SkinType)[keyof typeof SkinType];

export const SKIN_TYPES = Object.values(SkinType);

export const SkinTone = {
  FAIR: "fair",
  LIGHT: "light",
  MEDIUM: "medium",
  TAN: "tan",
  DEEP: "deep",
} as const;

export type SkinTone = (typeof SkinTone)[keyof typeof SkinTone];

export const SKIN_TONES = Object.values(SkinTone);

/**
 * Skin undertone — the universal beauty-industry term (Sephora, Ulta, MAC,
 * NARS all use "undertone"). Replaces our older "skin_subtone" wording.
 */
export const Undertone = {
  COOL: "cool",
  NEUTRAL: "neutral",
  WARM: "warm",
} as const;

export type Undertone = (typeof Undertone)[keyof typeof Undertone];

export const UNDERTONES = Object.values(Undertone);

/**
 * Fitzpatrick scale (I–VI) — the dermatological standard for skin
 * phototype. Used alongside `SkinTone` for clinical-grade matching.
 */
export const FitzpatrickScale = {
  I: "I",
  II: "II",
  III: "III",
  IV: "IV",
  V: "V",
  VI: "VI",
} as const;

export type FitzpatrickScale =
  (typeof FitzpatrickScale)[keyof typeof FitzpatrickScale];

export const FITZPATRICK_SCALES = Object.values(FitzpatrickScale);

export const SkinConcern = {
  ACNE: "acne",
  AGING: "aging",
  PIGMENTATION: "pigmentation",
  DRYNESS: "dryness",
  SENSITIVITY: "sensitivity",
  PORES: "pores",
  DARK_CIRCLES: "dark_circles",
  REDNESS: "redness",
} as const;

export type SkinConcern = (typeof SkinConcern)[keyof typeof SkinConcern];

export const SKIN_CONCERNS = Object.values(SkinConcern);

/**
 * Fragrance families — the perfumery-industry standard taxonomy used by
 * IFRA / Fragrantica. Replaces our older "fragrance_preferences" wording.
 */
export const FragranceFamily = {
  FLORAL: "floral",
  WOODY: "woody",
  CITRUS: "citrus",
  ORIENTAL: "oriental",
  FRESH: "fresh",
  GOURMAND: "gourmand",
} as const;

export type FragranceFamily =
  (typeof FragranceFamily)[keyof typeof FragranceFamily];

export const FRAGRANCE_FAMILIES = Object.values(FragranceFamily);

export const BeautyInterest = {
  SKINCARE: "skincare",
  MAKEUP: "makeup",
  FRAGRANCE: "fragrance",
  HAIRCARE: "haircare",
  BODYCARE: "bodycare",
} as const;

export type BeautyInterest =
  (typeof BeautyInterest)[keyof typeof BeautyInterest];

export const BEAUTY_INTERESTS = Object.values(BeautyInterest);

export const ShadeCategory = {
  FOUNDATION: "foundation",
  CONCEALER: "concealer",
  LIPSTICK: "lipstick",
  BLUSH: "blush",
  BRONZER: "bronzer",
} as const;

export type ShadeCategory = (typeof ShadeCategory)[keyof typeof ShadeCategory];

export const SHADE_CATEGORIES = Object.values(ShadeCategory);

export const HairType = {
  STRAIGHT: "straight",
  WAVY: "wavy",
  CURLY: "curly",
  COILY: "coily",
} as const;

export type HairType = (typeof HairType)[keyof typeof HairType];

export const HAIR_TYPES = Object.values(HairType);

export const HairTexture = {
  FINE: "fine",
  MEDIUM: "medium",
  COARSE: "coarse",
} as const;

export type HairTexture = (typeof HairTexture)[keyof typeof HairTexture];

export const HAIR_TEXTURES = Object.values(HairTexture);
