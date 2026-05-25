import type { ShadeCategory, SkinTone, Undertone } from "@loreal/contracts";

export interface ShadeRecord {
  productId: string;
  brandId: string;
  shadeCode: string;
  category: ShadeCategory;
  skinTone: SkinTone;
  undertone: Undertone;
}

export interface ShadeMatchInput {
  targetCategory: ShadeCategory;
  customerSkinTone: SkinTone;
  customerUndertone: Undertone;
  currentShades: ShadeRecord[];
  availableShades: ShadeRecord[];
  targetBrandId?: string;
}

export interface ShadeMatchResult {
  shade: ShadeRecord;
  score: number;
  matchType: "exact" | "tone_match" | "adjacent";
}

// Tone adjacency: tones that are close enough to suggest as alternatives
const TONE_ADJACENCY: Record<SkinTone, SkinTone[]> = {
  fair: ["light"],
  light: ["fair", "medium"],
  medium: ["light", "tan"],
  tan: ["medium", "deep"],
  deep: ["tan"],
};

/**
 * RF-58, RF-60: Cross-brand shade matching.
 *
 * Finds matching shades for a customer based on their skin tone / undertone
 * and existing shade history. Useful for cross-brand shade matching (e.g.,
 * customer uses Lancôme Teint Idole shade 360N, find equivalent in YSL).
 */
export function findMatchingShades(input: ShadeMatchInput): ShadeMatchResult[] {
  const results: ShadeMatchResult[] = [];

  // Filter to target category and optionally by brand
  let candidates = input.availableShades.filter(
    (s) => s.category === input.targetCategory,
  );

  if (input.targetBrandId) {
    candidates = candidates.filter((s) => s.brandId === input.targetBrandId);
  }

  // Exclude shades the customer already has
  const ownedShadeKeys = new Set(
    input.currentShades.map((s) => `${s.productId}:${s.shadeCode}`),
  );

  candidates = candidates.filter(
    (s) => !ownedShadeKeys.has(`${s.productId}:${s.shadeCode}`),
  );

  for (const shade of candidates) {
    const toneMatch = shade.skinTone === input.customerSkinTone;
    const undertoneMatch = shade.undertone === input.customerUndertone;
    const adjacentTones = TONE_ADJACENCY[input.customerSkinTone] ?? [];
    const isAdjacentTone = adjacentTones.includes(shade.skinTone);

    if (toneMatch && undertoneMatch) {
      results.push({ shade, score: 100, matchType: "exact" });
    } else if (toneMatch) {
      results.push({ shade, score: 70, matchType: "tone_match" });
    } else if (isAdjacentTone && undertoneMatch) {
      results.push({ shade, score: 50, matchType: "adjacent" });
    } else if (isAdjacentTone) {
      results.push({ shade, score: 30, matchType: "adjacent" });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
