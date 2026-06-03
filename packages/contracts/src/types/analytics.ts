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
  /** "daily" | "weekly" | "monthly" | "quarterly" — matches sales_targets.periodKind. */
  periodKind: string;
  currency: string;
  /** Sum of targetValue for the period — MXN. */
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

// ── /analytics/appointment-targets ──────────────────────────────────

export interface AppointmentTargetRow {
  targetId: string;
  ownerType: "counter" | "user" | "store" | "area";
  ownerName: string | null;
  storeId: string | null;
  ownerUserId: string | null;
  periodKind: string;
  periodStart: string;
  periodEnd: string;
  target: number;
  actual: number;
  gap: number;
  attainmentPct: number | null;
}

export interface AppointmentTargetsAnalyticsResponse {
  period: AnalyticsPeriod;
  metricKind: "appointments_booked" | "appointments_completed";
  data: AppointmentTargetRow[];
}

// ── /analytics/follow-ups ───────────────────────────────────────────

export interface FollowUpKPIsResponse {
  period: AnalyticsPeriod;
  total: number;
  completed: number;
  dismissed: number;
  pending: number;
  overdue: number;
  dueToday: number;
  /** completed / total, 2 decimals. */
  completionRate: number;
  byType: Array<{ triggerType: string; count: number }>;
}

// ── /analytics/banners-ranking ──────────────────────────────────────

export interface BannerRankingRow {
  banner: string;
  bannerName: string;
  storeCount: number;
  sales: {
    totalAmount: number;
    orderCount: number;
    uniqueCustomers: number;
    avgTicket: number;
  };
  newCustomers: number;
}

export interface BannersRankingAnalyticsResponse {
  period: AnalyticsPeriod;
  data: BannerRankingRow[];
}

// ── /analytics/export?type=customers ────────────────────────────────

export interface CustomerExportRow {
  customerId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  birthDate: string | null;
  lifecycleSegment: string | null;
  loyaltyTier: string | null;
  totalSpent: string;
  ordersCount: number;
  customerSince: string;
  lastContactAt: string | null;
  lastTransactionAt: string | null;
  lastVisitAt: string | null;
  lastBaUserId: string | null;
  lastBaName: string | null;
  lastFollowUpType: string | null;
  lastFollowUpCompletedAt: string | null;
  nextFollowUpType: string | null;
  nextFollowUpDueDate: string | null;
  openFollowUpCount: number;
  overdueFollowUpCount: number;
  storeId: string;
  storeName: string | null;
  banner: string | null;
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

// ── Report filters (shared across all analytics endpoints) ────────────

/**
 * The full filter set every report endpoint must accept. Each field is
 * optional — server-side role scoping still applies regardless of which
 * filters the caller sends. Keep this type as the single source of truth
 * for both the API controller and the web hooks.
 */
export interface ReportFilters {
  from?: string;
  to?: string;
  banner?: string;
  brandId?: string;
  storeId?: string;
  baUserId?: string;
  zoneId?: string;
}

// ── /analytics/filter-options ──────────────────────────────────────

export interface FilterOption {
  id: string;
  label: string;
}

/**
 * Faceted filter options for the report bars. Each slot lists only entities
 * that produced at least one activity row under the current filters. Slots
 * are computed by applying every OTHER active filter except their own value.
 */
export interface FilterOptionsResponse {
  stores: FilterOption[];
  brands: FilterOption[];
  banners: FilterOption[];
  baUsers: FilterOption[];
  zones: FilterOption[];
}
