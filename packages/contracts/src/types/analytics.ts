/**
 * Response shapes for the analytics module's newer endpoints. Older endpoints
 * (dashboard, sales-trend, sales-breakdown, ba-performance, retention, etc.)
 * still type their shapes inline in apps/web — those should migrate here too
 * when touched, but we don't move them now to keep this change focused.
 *
 * Every shape is the literal JSON the API returns; manually keep this file in
 * sync with the corresponding service in apps/api/src/modules/analytics/*.
 */

export interface AnalyticsPeriod {
  from: string;
  to: string;
}

// ── /analytics/sales-targets ─────────────────────────────────────────

export interface SalesTargetRow {
  storeId: string;
  storeName: string | null;
  brandId: string;
  brandName: string | null;
  /** "daily" | "monthly" — matches sales_targets.period. */
  period: string;
  currency: string;
  /** Sum of targetAmount for the period — MXN. */
  target: number;
  /** Actual revenue from line_items.price filtered by brand, in the same period. */
  actual: number;
  /** actual - target. Negative = behind. */
  gap: number;
  /** Math.round(actual / target * 100). Null when target = 0. */
  attainmentPct: number | null;
  orderCount: number;
}

export interface SalesTargetsAnalyticsResponse {
  period: AnalyticsPeriod;
  data: SalesTargetRow[];
}

// ── /analytics/ba-ratings ────────────────────────────────────────────

export interface BaNpsRow {
  baId: string;
  baName: string;
  storeId: string;
  total: number;
  promoters: number;
  passives: number;
  detractors: number;
  /** Average raw score (0..10). Null when no ratings. */
  avgScore: number | null;
  /** Standard NPS = %promoters − %detractors, rounded. */
  nps: number;
}

export interface BaRatingsAnalyticsResponse {
  period: AnalyticsPeriod;
  /** Aggregated NPS for the entire scope; null when no ratings. */
  overall: { total: number; nps: number } | null;
  data: BaNpsRow[];
}

// ── /analytics/ai-usage ──────────────────────────────────────────────

export interface AiUsageTotals {
  calls: number;
  /** USD; sum across all rows. */
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  errors: number;
  /** Math.round(errors / calls * 100). */
  errorRatePct: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
}

export interface AiUsageByFeatureRow {
  feature: string;
  calls: number;
  costUsd: number;
  errors: number;
}

export interface AiUsageByProviderRow {
  provider: string;
  model: string;
  calls: number;
  costUsd: number;
  avgLatencyMs: number;
}

export interface AiUsageAnalyticsResponse {
  period: AnalyticsPeriod;
  totals: AiUsageTotals;
  byFeature: AiUsageByFeatureRow[];
  byProvider: AiUsageByProviderRow[];
}

// ── /analytics/zone-heatmap ──────────────────────────────────────────

export interface ZoneHeatmapRow {
  /** INEGI municipality id (5-digit). */
  municipalityId: string;
  /** Municipality / alcaldía name; null only if the join could not resolve. */
  name: string | null;
  stateName: string | null;
  customerCount: number;
  newCustomersInPeriod: number;
  salesAmount: number;
  orderCount: number;
  storeCount: number;
  /** Average lat across stores in the municipality; null when no store coords. */
  lat: number | null;
  lng: number | null;
}

export interface ZoneHeatmapResponse {
  period: AnalyticsPeriod;
  data: ZoneHeatmapRow[];
}

// ── /analytics/pipeline ──────────────────────────────────────────────

export interface PipelineTriggerBucket {
  /** Matches suggestedActions.triggerType — see schema enum. */
  triggerType: string;
  overdue: number;
  today: number;
  upcoming: number;
  total: number;
}

export interface PipelineAbandonedCarts {
  open: number;
  totalValue: number;
  /** Present only for managers (BA path never includes abandoned-carts). */
  recoveredLast30d?: number;
  recoveredValueLast30d?: number;
}

export interface PipelineResponse {
  scope: {
    role: string | null;
    /** "personal" for BA, "store_scope" for manager-tier, "global" for admin. */
    viewMode: "personal" | "store_scope" | "global";
    /** null for admin (no scope), [] for BAs. */
    storeIds: string[] | null;
  };
  totals: { overdue: number; today: number; upcoming: number; total: number };
  byTriggerType: PipelineTriggerBucket[];
  /** Null for BAs — abandoned-cart pool is manager-only. */
  abandonedCarts: PipelineAbandonedCarts | null;
}

// ── /analytics/vip-breakdown ─────────────────────────────────────────

export interface VipBrandBreakdownRow {
  brandId: string;
  brandName: string;
  divisionId: string | null;
  /** brand_configs.vipThresholdAmount; null when the brand has no config. */
  thresholdAmount: number | null;
  /** brand_configs.vipThresholdPeriodMonths (default 12). */
  windowMonths: number;
  vipCount: number;
  /** Customers between 80% and 100% of threshold — about to qualify / fall off. */
  atRiskCount: number;
  totalCustomers: number;
  /** Math.round(vipCount / totalCustomers * 100); 0 when no customers. */
  vipPenetrationPct: number | null;
}

export interface VipBreakdownResponse {
  data: VipBrandBreakdownRow[];
}

// ── /analytics/vip-customers ─────────────────────────────────────────

export interface VipCustomerRow {
  customerId: string;
  name: string;
  totalSpent: number;
  ordersCount: number;
  lastOrderAt: string | null;
  loyaltyTier: string | null;
  signupStoreId: string;
}

export interface VipCustomersResponse {
  data: VipCustomerRow[];
}
