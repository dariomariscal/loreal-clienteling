export interface CreateBrand {
  code: string;
  displayName: string;
  tier: string;
  logoUrl?: string;
}

export type UpdateBrand = Partial<CreateBrand> & { isActive?: boolean };

export interface UpsertBrandConfig {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  fontFamily?: string;
  replenishmentRules?: Record<string, unknown>;
  isVirtualTryonEnabled?: boolean;
  vipThresholdAmount?: number;
  vipThresholdPeriodMonths?: number;
}
