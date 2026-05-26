import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { API_URL } from "@/lib/constants";

// ── Types ──────────────────────────────────────────────────────────

export interface DashboardMetrics {
  totalCustomers: number;
  sales: { totalAmount: string; transactionCount: number };
  appointments: number;
  newCustomers: number;
  communicationsSent: number;
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
  transactionCount: number;
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
  sales: { totalAmount: string; transactionCount: number };
  registrations: number;
  communicationsSent: number;
  recommendations: { total: number; converted: number; conversionRate: number };
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
  dashboard: (from?: string, to?: string) => ["analytics", "dashboard", from, to] as const,
  salesTrend: (interval: string, from?: string, to?: string) => ["analytics", "sales-trend", interval, from, to] as const,
  salesBreakdown: (groupBy: string, from?: string, to?: string) => ["analytics", "sales-breakdown", groupBy, from, to] as const,
  baPerformance: (from?: string, to?: string) => ["analytics", "ba-performance", from, to] as const,
  appointmentMetrics: (from?: string, to?: string) => ["analytics", "appointments", from, to] as const,
  appointmentsByBa: (from?: string, to?: string) => ["analytics", "appointments-by-ba", from, to] as const,
  agendaReport: (filters: Record<string, string | undefined>) => ["analytics", "agenda-report", filters] as const,
  conversion: (from?: string, to?: string, trending?: boolean) => ["analytics", "conversion", from, to, trending] as const,
  customers: ["analytics", "customers"] as const,
  retention: ["analytics", "retention"] as const,
  zoneOverview: (from?: string, to?: string) => ["analytics", "zone-overview", from, to] as const,
  storesRanking: (from?: string, to?: string) => ["analytics", "stores-ranking", from, to] as const,
  counterManagersRanking: (from?: string, to?: string) =>
    ["analytics", "counter-managers-ranking", from, to] as const,
  zonesRanking: (from?: string, to?: string) => ["analytics", "zones-ranking", from, to] as const,
  brandsComparison: (storeId: string, from?: string, to?: string) =>
    ["analytics", "brands-comparison", storeId, from, to] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useDashboardMetrics(from?: string, to?: string) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return useQuery({
    queryKey: analyticsKeys.dashboard(from, to),
    queryFn: () => api.get<DashboardMetrics>("/analytics/dashboard", Object.keys(params).length ? params : undefined),
  });
}

export function useSalesTrend(interval = "month", from?: string, to?: string) {
  const params: Record<string, string> = { interval };
  if (from) params.from = from;
  if (to) params.to = to;
  return useQuery({
    queryKey: analyticsKeys.salesTrend(interval, from, to),
    queryFn: () => api.get<SalesTrendData>("/analytics/sales-trend", params),
  });
}

export function useSalesBreakdown(groupBy: "category" | "brand" = "category", from?: string, to?: string) {
  const params: Record<string, string> = { groupBy };
  if (from) params.from = from;
  if (to) params.to = to;
  return useQuery({
    queryKey: analyticsKeys.salesBreakdown(groupBy, from, to),
    queryFn: () => api.get<{ groupBy: string; data: SalesBreakdownItem[] }>("/analytics/sales-breakdown", params),
  });
}

export function useBaPerformance(from?: string, to?: string) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return useQuery({
    queryKey: analyticsKeys.baPerformance(from, to),
    queryFn: () => api.get<BaPerformanceRow[]>("/analytics/ba-performance", Object.keys(params).length ? params : undefined),
  });
}

export function useAppointmentMetrics(from?: string, to?: string) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return useQuery({
    queryKey: analyticsKeys.appointmentMetrics(from, to),
    queryFn: () => api.get<AppointmentMetrics>("/analytics/appointments", Object.keys(params).length ? params : undefined),
  });
}

export function useAppointmentsByBa(from?: string, to?: string) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return useQuery({
    queryKey: analyticsKeys.appointmentsByBa(from, to),
    queryFn: () => api.get<{ data: AppointmentByBaRow[] }>("/analytics/appointments-by-ba", Object.keys(params).length ? params : undefined),
  });
}

export function useAgendaReport(filters: {
  from?: string;
  to?: string;
  baUserId?: string;
  status?: string;
  page?: string;
  limit?: string;
}) {
  const params: Record<string, string> = {};
  Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
  return useQuery({
    queryKey: analyticsKeys.agendaReport(params),
    queryFn: () => api.get<{ data: AgendaReportRow[]; total: number; page: number; limit: number }>("/analytics/agenda-report", Object.keys(params).length ? params : undefined),
  });
}

export function useConversionMetrics(from?: string, to?: string, trending = false) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  if (trending) params.trending = "true";
  return useQuery({
    queryKey: analyticsKeys.conversion(from, to, trending),
    queryFn: () => api.get<ConversionMetrics>("/analytics/conversion", Object.keys(params).length ? params : undefined),
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

export function useZoneOverview(from?: string, to?: string) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return useQuery({
    queryKey: analyticsKeys.zoneOverview(from, to),
    queryFn: () =>
      api.get<ZoneOverview>(
        "/analytics/zone-overview",
        Object.keys(params).length ? params : undefined,
      ),
  });
}

export function useStoresRanking(from?: string, to?: string) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return useQuery({
    queryKey: analyticsKeys.storesRanking(from, to),
    queryFn: () =>
      api.get<{ period: { from: string; to: string }; data: StoreRankingRow[] }>(
        "/analytics/stores-ranking",
        Object.keys(params).length ? params : undefined,
      ),
  });
}

export function useCounterManagersRanking(from?: string, to?: string) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return useQuery({
    queryKey: analyticsKeys.counterManagersRanking(from, to),
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

export function useZonesRanking(from?: string, to?: string) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return useQuery({
    queryKey: analyticsKeys.zonesRanking(from, to),
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

export function useBrandsComparison(storeId: string, from?: string, to?: string) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return useQuery({
    queryKey: analyticsKeys.brandsComparison(storeId, from, to),
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

export function useAnalyticsExport() {
  return useMutation({
    mutationFn: async ({
      type,
      format = "csv",
      from,
      to,
    }: {
      type: string;
      format?: "csv" | "xlsx";
      from?: string;
      to?: string;
    }) => {
      const params = new URLSearchParams({ type, format });
      if (from) params.set("from", from);
      if (to) params.set("to", to);

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
