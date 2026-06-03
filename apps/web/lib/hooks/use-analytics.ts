import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { API_URL } from "@/lib/constants";
import type {
  SalesTargetsAnalyticsResponse,
  BaRatingsAnalyticsResponse,
  AiUsageAnalyticsResponse,
  ZoneHeatmapResponse,
  PipelineResponse,
  VipBreakdownResponse,
  VipCustomersResponse,
  AppointmentTargetsAnalyticsResponse,
  FollowUpKPIsResponse,
  BannersRankingAnalyticsResponse,
  CustomerExportRow,
  ReportFilters,
  FilterOptionsResponse,
} from "@loreal/contracts";

/**
 * Serialises a ReportFilters object into a query-string params record. Drops
 * empty / undefined values so the URL and React Query cache key stay clean.
 * Every hook in this file pipes its filters through this helper so the shape
 * sent to the API is consistent.
 */
function paramsFrom(filters: ReportFilters): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v != null && v !== "") out[k] = String(v);
  }
  return out;
}

// ── Types ──────────────────────────────────────────────────────────

export interface DashboardMetrics {
  totalCustomers: number;
  sales: { totalAmount: string; orderCount: number };
  appointments: number;
  newCustomers: number;
  messagesSent: number;
  period: { from: string; to: string };
}

export interface ConversionMetrics {
  recommendationToSale: { total: number; converted: number; rate: number };
  sampleToSale: { total: number; converted: number; rate: number };
  period: { from: string; to: string };
  trend?: { date: string; total: number; converted: number; rate: number }[];
}

export interface SegmentCount {
  segment: string;
  count: number;
}

export interface SalesTrendPoint {
  date: string;
  totalAmount: string;
  orderCount: number;
}

export interface SalesTrendData {
  interval: string;
  data: SalesTrendPoint[];
  period: { from: string; to: string };
}

export interface SalesBreakdownItem {
  category?: string;
  brandId?: string;
  totalAmount: string;
  itemCount: number;
}

export interface BaPerformanceRow {
  baId: string;
  fullName: string;
  storeId: string;
  sales: { totalAmount: string; orderCount: number };
  registrations: number;
  messagesSent: number;
  recommendations: { total: number; converted: number; conversionRate: number };
  followUps: {
    total: number;
    completed: number;
    dismissed: number;
    overdue: number;
    /** completed / total (0..1). */
    completionRate: number;
  };
}

export interface AppointmentMetrics {
  total: number;
  scheduled: number;
  confirmed: number;
  completed: number;
  rescheduled: number;
  cancelled: number;
  noShow: number;
  period: { from: string; to: string };
}

export interface AppointmentByBaRow {
  baUserId: string;
  baName: string;
  total: number;
  completed: number;
  scheduled: number;
  confirmed: number;
  cancelled: number;
  noShow: number;
  rescheduled: number;
  completionRate: number;
  noShowRate: number;
  cancellationRate: number;
}

export interface AgendaReportRow {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  eventType: string;
  eventTypeName: string | null;
  status: string;
  comments: string | null;
  isVirtual: boolean;
  customerName: string;
  customerPhone: string | null;
  customerId: string;
  baName: string;
  baUserId: string;
  storeName: string;
  storeId: string;
}

export interface RetentionData {
  segments: Record<string, number>;
  total: number;
  churnRate: number;
  atRiskCustomers: {
    id: string;
    name: string;
    lastTransactionAt: string | null;
    lastContactAt: string | null;
    baName: string | null;
    daysSinceLastPurchase: number | null;
  }[];
}

// ── Query keys ─────────────────────────────────────────────────────

export const analyticsKeys = {
  dashboard: (filters: ReportFilters) => ["analytics", "dashboard", filters] as const,
  salesTrend: (interval: string, filters: ReportFilters) =>
    ["analytics", "sales-trend", interval, filters] as const,
  salesBreakdown: (groupBy: string, filters: ReportFilters) =>
    ["analytics", "sales-breakdown", groupBy, filters] as const,
  baPerformance: (filters: ReportFilters) =>
    ["analytics", "ba-performance", filters] as const,
  appointmentMetrics: (filters: ReportFilters) =>
    ["analytics", "appointments", filters] as const,
  appointmentsByBa: (filters: ReportFilters) =>
    ["analytics", "appointments-by-ba", filters] as const,
  agendaReport: (filters: Record<string, string | undefined>) =>
    ["analytics", "agenda-report", filters] as const,
  conversion: (filters: ReportFilters, trending?: boolean) =>
    ["analytics", "conversion", filters, trending] as const,
  customers: ["analytics", "customers"] as const,
  retention: ["analytics", "retention"] as const,
  zoneOverview: (filters: ReportFilters) =>
    ["analytics", "zone-overview", filters] as const,
  storesRanking: (filters: StoresRankingFilters) =>
    ["analytics", "stores-ranking", filters] as const,
  bannersRanking: (filters: ReportFilters) =>
    ["analytics", "banners-ranking", filters] as const,
  counterManagersRanking: (filters: ReportFilters) =>
    ["analytics", "counter-managers-ranking", filters] as const,
  zonesRanking: (filters: ReportFilters) =>
    ["analytics", "zones-ranking", filters] as const,
  appointmentTargets: (
    filters: ReportFilters,
    metricKind?: "appointments_booked" | "appointments_completed",
  ) => ["analytics", "appointment-targets", filters, metricKind] as const,
  followUps: (filters: ReportFilters) =>
    ["analytics", "follow-ups", filters] as const,
  brandsComparison: (storeId: string, filters: ReportFilters) =>
    ["analytics", "brands-comparison", storeId, filters] as const,
  salesTargetsAnalytics: (filters: ReportFilters) =>
    ["analytics", "sales-targets", filters] as const,
  baRatingsAnalytics: (filters: ReportFilters) =>
    ["analytics", "ba-ratings", filters] as const,
  aiUsage: (filters: ReportFilters) =>
    ["analytics", "ai-usage", filters] as const,
  zoneHeatmap: (filters: ReportFilters) =>
    ["analytics", "zone-heatmap", filters] as const,
  filterOptions: (filters: ReportFilters) =>
    ["analytics", "filter-options", filters] as const,
  pipeline: ["analytics", "pipeline"] as const,
  vipBreakdown: ["analytics", "vip-breakdown"] as const,
  vipCustomers: (limit?: number) =>
    ["analytics", "vip-customers", limit] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useDashboardMetrics(filters: ReportFilters) {
  const params = paramsFrom(filters);
  return useQuery({
    queryKey: analyticsKeys.dashboard(filters),
    queryFn: () =>
      api.get<DashboardMetrics>(
        "/analytics/dashboard",
        Object.keys(params).length ? params : undefined,
      ),
  });
}

export function useSalesTrend(interval: "day" | "week" | "month", filters: ReportFilters) {
  const params = { interval, ...paramsFrom(filters) };
  return useQuery({
    queryKey: analyticsKeys.salesTrend(interval, filters),
    queryFn: () => api.get<SalesTrendData>("/analytics/sales-trend", params),
  });
}

export function useSalesBreakdown(
  groupBy: "category" | "brand",
  filters: ReportFilters,
) {
  const params = { groupBy, ...paramsFrom(filters) };
  return useQuery({
    queryKey: analyticsKeys.salesBreakdown(groupBy, filters),
    queryFn: () =>
      api.get<{ groupBy: string; data: SalesBreakdownItem[] }>(
        "/analytics/sales-breakdown",
        params,
      ),
  });
}

export function useBaPerformance(filters: ReportFilters) {
  const params = paramsFrom(filters);
  return useQuery({
    queryKey: analyticsKeys.baPerformance(filters),
    queryFn: () =>
      api.get<BaPerformanceRow[]>(
        "/analytics/ba-performance",
        Object.keys(params).length ? params : undefined,
      ),
  });
}

export function useAppointmentMetrics(filters: ReportFilters) {
  const params = paramsFrom(filters);
  return useQuery({
    queryKey: analyticsKeys.appointmentMetrics(filters),
    queryFn: () =>
      api.get<AppointmentMetrics>(
        "/analytics/appointments",
        Object.keys(params).length ? params : undefined,
      ),
  });
}

export function useAppointmentsByBa(filters: ReportFilters) {
  const params = paramsFrom(filters);
  return useQuery({
    queryKey: analyticsKeys.appointmentsByBa(filters),
    queryFn: () =>
      api.get<{ data: AppointmentByBaRow[] }>(
        "/analytics/appointments-by-ba",
        Object.keys(params).length ? params : undefined,
      ),
  });
}

export function useAgendaReport(filters: ReportFilters & {
  status?: string;
  page?: string;
  limit?: string;
}) {
  const params: Record<string, string> = {};
  Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = String(v); });
  return useQuery({
    queryKey: analyticsKeys.agendaReport(params),
    queryFn: () => api.get<{ data: AgendaReportRow[]; total: number; page: number; limit: number }>("/analytics/agenda-report", Object.keys(params).length ? params : undefined),
  });
}

export function useConversionMetrics(filters: ReportFilters, trending = false) {
  const params = paramsFrom(filters);
  if (trending) params.trending = "true";
  return useQuery({
    queryKey: analyticsKeys.conversion(filters, trending),
    queryFn: () =>
      api.get<ConversionMetrics>(
        "/analytics/conversion",
        Object.keys(params).length ? params : undefined,
      ),
  });
}

export function useCustomerSegments() {
  return useQuery({
    queryKey: analyticsKeys.customers,
    queryFn: () => api.get<SegmentCount[]>("/analytics/customers"),
  });
}

export function useRetention() {
  return useQuery({
    queryKey: analyticsKeys.retention,
    queryFn: () => api.get<RetentionData>("/analytics/retention"),
  });
}

// ── Zone-level analytics (Area Manager / National Retail Manager) ──

export interface ZoneOverview {
  period: { from: string; to: string };
  scope: { storeCount: number | null; storeIds: string[] | null };
  sales: { totalAmount: number; orderCount: number; uniqueCustomers: number };
  customers: { total: number; newInPeriod: number };
  appointments: { total: number; completed: number; noShow: number };
  recommendations: {
    total: number;
    converted: number;
    conversionPct: number | null;
  };
  samples: { delivered: number; converted: number };
}

export interface StoreRankingRow {
  storeId: string;
  storeName: string;
  zoneId: string | null;
  banner: string;
  sales: {
    totalAmount: number;
    orderCount: number;
    uniqueCustomers: number;
    avgTicket: number;
  };
  newCustomers: number;
  recommendations: {
    total: number;
    converted: number;
    conversionPct: number | null;
  };
}

/** Filters for `useStoresRanking`. */
export interface StoresRankingFilters {
  from?: string;
  to?: string;
  banner?: string;
  retailGroupId?: string;
}

export interface CounterManagerRankingRow {
  userId: string;
  fullName: string;
  storeId: string | null;
  brandId: string | null;
  sales: { totalAmount: number; orderCount: number };
}

export interface ZoneRankingAggRow {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  storeCount: number;
  sales: {
    totalAmount: number;
    orderCount: number;
    uniqueCustomers: number;
    avgTicket: number;
  };
  newCustomers: number;
  recommendations: {
    total: number;
    converted: number;
    conversionPct: number | null;
  };
}

export interface BrandComparisonRow {
  brandId: string;
  brandName: string;
  divisionId: string | null;
  sales: { totalAmount: number; itemCount: number };
  recommendations: {
    total: number;
    converted: number;
    conversionPct: number | null;
  };
}

export function useZoneOverview(filters: ReportFilters) {
  const params = paramsFrom(filters);
  return useQuery({
    queryKey: analyticsKeys.zoneOverview(filters),
    queryFn: () =>
      api.get<ZoneOverview>(
        "/analytics/zone-overview",
        Object.keys(params).length ? params : undefined,
      ),
  });
}

export function useStoresRanking(filters: StoresRankingFilters = {}) {
  const params: Record<string, string> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.banner) params.banner = filters.banner;
  if (filters.retailGroupId) params.retailGroupId = filters.retailGroupId;
  return useQuery({
    queryKey: analyticsKeys.storesRanking(filters),
    queryFn: () =>
      api.get<{ period: { from: string; to: string }; data: StoreRankingRow[] }>(
        "/analytics/stores-ranking",
        Object.keys(params).length ? params : undefined,
      ),
  });
}

/**
 * Top Franquicias — ranking aggregated by `stores.banner`. Visible to
 * area_manager / national_retail_manager / admin.
 */
export function useBannersRanking(filters: ReportFilters) {
  const params = paramsFrom(filters);
  return useQuery({
    queryKey: analyticsKeys.bannersRanking(filters),
    queryFn: () =>
      api.get<BannersRankingAnalyticsResponse>(
        "/analytics/banners-ranking",
        Object.keys(params).length ? params : undefined,
      ),
  });
}

/**
 * Appointment targets vs actual (Salesforce Goal pattern). `metricKind`
 * switches between booked and completed appointments.
 */
export function useAppointmentTargetsAnalytics(
  filters: ReportFilters,
  metricKind: "appointments_booked" | "appointments_completed" = "appointments_booked",
) {
  const params = { metricKind, ...paramsFrom(filters) };
  return useQuery({
    queryKey: analyticsKeys.appointmentTargets(filters, metricKind),
    queryFn: () =>
      api.get<AppointmentTargetsAnalyticsResponse>(
        "/analytics/appointment-targets",
        params,
      ),
  });
}

/**
 * Follow-up KPIs (Tulip 5-bucket pattern). Scope: BA sees self, manager+ sees
 * their accessible BAs.
 */
export function useFollowUpKPIs(filters: ReportFilters) {
  const params = paramsFrom(filters);
  return useQuery({
    queryKey: analyticsKeys.followUps(filters),
    queryFn: () =>
      api.get<FollowUpKPIsResponse>(
        "/analytics/follow-ups",
        Object.keys(params).length ? params : undefined,
      ),
  });
}

export function useCounterManagersRanking(filters: ReportFilters) {
  const params = paramsFrom(filters);
  return useQuery({
    queryKey: analyticsKeys.counterManagersRanking(filters),
    queryFn: () =>
      api.get<{
        period: { from: string; to: string };
        data: CounterManagerRankingRow[];
      }>(
        "/analytics/counter-managers-ranking",
        Object.keys(params).length ? params : undefined,
      ),
  });
}

export function useZonesRanking(filters: ReportFilters) {
  const params = paramsFrom(filters);
  return useQuery({
    queryKey: analyticsKeys.zonesRanking(filters),
    queryFn: () =>
      api.get<{
        period: { from: string; to: string };
        data: ZoneRankingAggRow[];
      }>(
        "/analytics/zones-ranking",
        Object.keys(params).length ? params : undefined,
      ),
  });
}

export function useBrandsComparison(storeId: string, filters: ReportFilters) {
  const params = paramsFrom(filters);
  return useQuery({
    queryKey: analyticsKeys.brandsComparison(storeId, filters),
    queryFn: () =>
      api.get<{
        storeId: string;
        period: { from: string; to: string };
        data: BrandComparisonRow[];
      }>(
        `/analytics/stores/${storeId}/brands-comparison`,
        Object.keys(params).length ? params : undefined,
      ),
    enabled: !!storeId,
  });
}

// ── New role-aware analytics endpoints ────────────────────────────

export function useSalesTargetsAnalytics(filters: ReportFilters) {
  const params = paramsFrom(filters);
  return useQuery({
    queryKey: analyticsKeys.salesTargetsAnalytics(filters),
    queryFn: () =>
      api.get<SalesTargetsAnalyticsResponse>(
        "/analytics/sales-targets",
        Object.keys(params).length ? params : undefined,
      ),
  });
}

export function useBaRatingsAnalytics(filters: ReportFilters) {
  const params = paramsFrom(filters);
  return useQuery({
    queryKey: analyticsKeys.baRatingsAnalytics(filters),
    queryFn: () =>
      api.get<BaRatingsAnalyticsResponse>(
        "/analytics/ba-ratings",
        Object.keys(params).length ? params : undefined,
      ),
  });
}

export function useAiUsage(filters: ReportFilters) {
  const params = paramsFrom(filters);
  return useQuery({
    queryKey: analyticsKeys.aiUsage(filters),
    queryFn: () =>
      api.get<AiUsageAnalyticsResponse>(
        "/analytics/ai-usage",
        Object.keys(params).length ? params : undefined,
      ),
  });
}

export function useZoneHeatmap(filters: ReportFilters) {
  const params = paramsFrom(filters);
  return useQuery({
    queryKey: analyticsKeys.zoneHeatmap(filters),
    queryFn: () =>
      api.get<ZoneHeatmapResponse>(
        "/analytics/zone-heatmap",
        Object.keys(params).length ? params : undefined,
      ),
  });
}

export function usePipeline() {
  return useQuery({
    queryKey: analyticsKeys.pipeline,
    queryFn: () => api.get<PipelineResponse>("/analytics/pipeline"),
  });
}

export function useVipBreakdown() {
  return useQuery({
    queryKey: analyticsKeys.vipBreakdown,
    queryFn: () => api.get<VipBreakdownResponse>("/analytics/vip-breakdown"),
  });
}

export function useVipCustomers(limit?: number) {
  const params: Record<string, string> = {};
  if (limit) params.limit = String(limit);
  return useQuery({
    queryKey: analyticsKeys.vipCustomers(limit),
    queryFn: () =>
      api.get<VipCustomersResponse>(
        "/analytics/vip-customers",
        Object.keys(params).length ? params : undefined,
      ),
  });
}

export type AnalyticsExportParams = ReportFilters & {
  type: "customers" | "sales" | "appointments" | "agenda-report" | string;
  format?: "csv" | "xlsx";
};

export function useAnalyticsExport() {
  return useMutation({
    mutationFn: async ({
      type,
      format = "csv",
      ...filters
    }: AnalyticsExportParams) => {
      const params = new URLSearchParams({ type, format });
      for (const [k, v] of Object.entries(paramsFrom(filters))) {
        params.set(k, v);
      }

      const url = `${API_URL}/analytics/export?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const ext = format === "xlsx" ? "xlsx" : "csv";
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `reporte-${type}-${new Date().toISOString().split("T")[0]}.${ext}`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    },
  });
}

/**
 * JSON variant of the customers export. Lets the UI preview the rows in a
 * table before downloading the CSV/XLSX. The backend returns the same wide
 * row shape as the file export.
 */
/**
 * Faceted filter-bar options. Each dropdown gets only the entities that have
 * activity under the currently selected filters (cascading) — selecting a
 * brand narrows the store/BA lists, etc. Use this instead of the raw
 * useStores / useBrands / useBanners / useUsers hooks inside report bars.
 */
export function useReportFilterOptions(filters: ReportFilters) {
  const params = paramsFrom(filters);
  return useQuery({
    queryKey: analyticsKeys.filterOptions(filters),
    queryFn: () =>
      api.get<FilterOptionsResponse>(
        "/analytics/filter-options",
        Object.keys(params).length ? params : undefined,
      ),
    // Options should feel near-instant on every filter change — keep the
    // previous list visible while the new one fetches.
    placeholderData: (prev) => prev,
  });
}

export function useCustomerExportPreview(filters: ReportFilters = {}) {
  const params: Record<string, string> = {
    type: "customers",
    format: "json",
    ...paramsFrom(filters),
  };
  return useQuery({
    queryKey: ["analytics", "export", "customers", filters] as const,
    queryFn: () => api.get<CustomerExportRow[]>("/analytics/export", params),
  });
}
