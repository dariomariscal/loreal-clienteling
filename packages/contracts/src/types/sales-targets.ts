export type SalesTargetPeriod = "daily" | "monthly";

export interface SalesTarget {
  id: string;
  storeId: string;
  brandId: string;
  period: SalesTargetPeriod;
  periodDate: string; // ISO date
  targetAmount: string; // numeric as string (MXN)
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalesTarget {
  storeId: string;
  brandId: string;
  period: SalesTargetPeriod;
  periodDate: string;
  targetAmount: number;
  currency?: string;
  notes?: string;
}

export type UpdateSalesTarget = Partial<Omit<CreateSalesTarget, "storeId" | "brandId" | "period" | "periodDate">>;

export interface SalesTargetFilters {
  storeId?: string;
  brandId?: string;
  period?: SalesTargetPeriod;
  from?: string;
  to?: string;
}

/** Today's target + actual progress for the counter dashboard hero. */
export interface CounterTargetProgress {
  date: string;
  storeId: string;
  brandId: string;
  targetAmount: number | null;
  actualAmount: number;
  attainmentPct: number | null;
  currency: string;
}
