export interface CreateBrand {
  code: string;
  displayName: string;
  tier: string;
  logoUrl?: string;
}

export type UpdateBrand = Partial<CreateBrand> & { active?: boolean };

export interface UpsertBrandConfig {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  fontFamily?: string;
  messageTemplates?: Record<string, unknown>;
  replenishmentRules?: Record<string, unknown>;
  virtualTryonEnabled?: boolean;
}
