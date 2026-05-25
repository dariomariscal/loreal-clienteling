export interface UpsertBeautyProfile {
  customerId: string;
  skinType?: string;
  skinTone?: string;
  /** Fitzpatrick scale I–VI (dermatological standard). */
  fitzpatrickScale?: string;
  undertone?: string;
  skinConcerns?: string[];
  preferredIngredients?: string[];
  avoidedIngredients?: string[];
  hairType?: string;
  hairTexture?: string;
  hairColorCurrent?: string;
  fragranceFamilies?: string[];
  makeupPreferences?: {
    coverage?: "light" | "medium" | "full";
    finish?: "matte" | "satin" | "dewy";
    style?: string[];
  };
  interests?: string[];
}

/**
 * A shade match captured for the customer (foundation, lipstick, etc).
 * Mirrors Sephora/Ulta's "My Shades" pattern.
 */
export interface CreateShadeMatch {
  category: string;
  brandId: string;
  productId: string;
  shadeCode: string;
}
