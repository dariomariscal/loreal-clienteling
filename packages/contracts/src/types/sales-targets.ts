/**
 * Polymorphic targets (Salesforce Goal + GoalMetric pattern).
 * One row covers counter / BA / store / area-level targets; metricKind
 * discriminates what is being measured.
 */
export type TargetOwnerType = "counter" | "user" | "store" | "area";

export type TargetMetricKind =
  | "sales_amount"
  | "sales_units"
  | "appointments_booked"
  | "appointments_completed"
  | "follow_ups_completed"
  | "new_customers"
  | "samples_given"
  | "visits";

export type TargetPeriodKind = "daily" | "weekly" | "monthly" | "quarterly";

export interface SalesTarget {
  id: string;
  ownerType: TargetOwnerType;
  storeId: string | null;
  brandId: string | null;
  ownerUserId: string | null;
  metricKind: TargetMetricKind;
  periodKind: TargetPeriodKind;
  periodStart: string; // ISO date YYYY-MM-DD
  periodEnd: string; // ISO date YYYY-MM-DD
  targetValue: string; // numeric as string
  currency: string | null;
  parentTargetId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalesTarget {
  ownerType?: TargetOwnerType;
  storeId?: string | null;
  brandId?: string | null;
  ownerUserId?: string | null;
  metricKind?: TargetMetricKind;
  periodKind: TargetPeriodKind;
  periodStart: string;
  periodEnd: string;
  targetValue: number;
  currency?: string;
  parentTargetId?: string | null;
  notes?: string;
}

export type UpdateSalesTarget = Partial<
  Pick<CreateSalesTarget, "targetValue" | "currency" | "notes">
>;

export interface SalesTargetFilters {
  ownerType?: TargetOwnerType;
  storeId?: string;
  brandId?: string;
  ownerUserId?: string;
  metricKind?: TargetMetricKind;
  periodKind?: TargetPeriodKind;
  from?: string;
  to?: string;
}

/** Today's target + actual progress for the counter dashboard hero. */
export interface CounterTargetProgress {
  date: string;
  storeId: string;
  brandId: string;
  targetValue: number | null;
  actualAmount: number;
  attainmentPct: number | null;
  currency: string;
}
