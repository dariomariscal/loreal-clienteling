import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CounterTargetProgress } from "./use-sales-targets";
import type { ShiftRosterEntry } from "./use-shifts";

// ── Types ──────────────────────────────────────────────────────────

export interface CounterPulseSnapshot {
  target: CounterTargetProgress | null;
  totalSales: number;
  orderCount: number;
  uniqueCustomers: number;
  newRegistrations: number;
  recommendations: {
    total: number;
    converted: number;
    conversionPct: number | null;
  };
  appointments: {
    total: number;
    scheduled: number;
    confirmed: number;
    completed: number;
    noShow: number;
    cancelled: number;
  };
  samples: {
    delivered: number;
    converted: number;
  };
}

/**
 * BA ranking row. Shape comes from analytics.getBaPerformance() (untyped on
 * the API side) merged with NPS aggregate. Kept loose with `unknown`
 * fall-throughs because backend fields can vary by configuration.
 */
export interface CounterBaRankingRow {
  baId: string;
  baName?: string;
  totalAmount?: string | number | null;
  orderCount?: number;
  recommendationsTotal?: number;
  recommendationsConverted?: number;
  recommendationConversionRate?: number;
  registrationsCount?: number;
  messagesCount?: number;
  nps: number | null;
  npsResponseCount: number;
  [key: string]: unknown;
}

export interface CounterUpcomingEvent {
  id: string;
  name: string;
  kind: string;
  startTime: string;
  endTime: string;
  capacity: number | null;
  status: string;
}

export interface CounterDashboardToday {
  date: string;
  storeId: string;
  brandId: string | null;
  pulse: CounterPulseSnapshot;
  team: {
    roster: ShiftRosterEntry[];
    ranking: CounterBaRankingRow[];
  };
  operations: {
    pendingApprovalCount: number;
    upcomingEvents: CounterUpcomingEvent[];
    stockAlertCount: number;
  };
}

export interface CounterDashboardParams {
  storeId?: string;
  brandId?: string;
  /** YYYY-MM-DD. Defaults to today in server timezone. */
  date?: string;
}

// ── Query keys ─────────────────────────────────────────────────────

const counterDashboardKeys = {
  today: (params: CounterDashboardParams) =>
    ["dashboards", "counter", "today", params] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useCounterDashboardToday(
  params: CounterDashboardParams = {},
) {
  const query: Record<string, string> = {};
  if (params.storeId) query.storeId = params.storeId;
  if (params.brandId) query.brandId = params.brandId;
  if (params.date) query.date = params.date;

  return useQuery({
    queryKey: counterDashboardKeys.today(params),
    queryFn: () =>
      api.get<CounterDashboardToday>("/dashboards/counter/today", query),
    // Pulse is meant to be glanceable; refetch every minute so the manager
    // sees fresh numbers without having to pull-to-refresh.
    refetchInterval: 60_000,
  });
}

// ── Zone-level dashboard (Area Manager / National Retail Manager) ──

/**
 * One row of the per-store ranking served inside the zone dashboard. The
 * server already sorts by sales desc.
 */
export interface ZoneRankingRow {
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

export interface ZoneUpcomingEvent extends CounterUpcomingEvent {
  storeId: string;
  storeName: string;
}

export interface ZonePulse {
  period: { from: string; to: string };
  scope: { storeCount: number | null; storeIds: string[] | null };
  sales: {
    totalAmount: number;
    orderCount: number;
    uniqueCustomers: number;
  };
  customers: {
    total: number;
    newInPeriod: number;
  };
  appointments: {
    total: number;
    completed: number;
    noShow: number;
  };
  recommendations: {
    total: number;
    converted: number;
    conversionPct: number | null;
  };
  samples: {
    delivered: number;
    converted: number;
  };
}

export interface ZoneDashboardToday {
  date: string;
  scope: { storeCount: number | null; storeIds: string[] | null };
  pulse: ZonePulse;
  ranking: ZoneRankingRow[];
  operations: {
    pendingApprovalCount: number;
    stockAlertCount: number;
    upcomingEvents: ZoneUpcomingEvent[];
  };
}

export interface ZoneDashboardParams {
  /** YYYY-MM-DD. Defaults to today in server timezone. */
  date?: string;
}

const zoneDashboardKeys = {
  today: (params: ZoneDashboardParams) =>
    ["dashboards", "zone", "today", params] as const,
};

export function useZoneDashboardToday(params: ZoneDashboardParams = {}) {
  const query: Record<string, string> = {};
  if (params.date) query.date = params.date;

  return useQuery({
    queryKey: zoneDashboardKeys.today(params),
    queryFn: () =>
      api.get<ZoneDashboardToday>(
        "/dashboards/zone/today",
        Object.keys(query).length ? query : undefined,
      ),
    refetchInterval: 60_000,
  });
}
