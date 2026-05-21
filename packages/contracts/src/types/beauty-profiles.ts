export interface UpsertBeautyProfile {
  customerId: string;
  skinType?: string;
  skinTone?: string;
  skinSubtone?: string;
  skinConcerns?: string[];
  preferredIngredients?: string[];
  avoidedIngredients?: string[];
  fragrancePreferences?: string[];
  makeupPreferences?: Record<string, unknown>;
  routineType?: string;
  interests?: string[];
}

export interface CreateShade {
  category: string;
  brandId: string;
  productId: string;
  shadeCode: string;
}
