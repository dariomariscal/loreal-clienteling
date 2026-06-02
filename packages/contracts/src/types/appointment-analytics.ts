import type {
  AppointmentOutcomeCode,
  AppointmentCancellationReason,
  AppointmentNoShowReason,
} from "../enums/appointment";

/**
 * Composite response for GET /analytics/appointments/overview.
 *
 * Single round-trip so the metrics page renders without a waterfall. The
 * shape is *role-aware*: BAs receive `teamRanking = null`, managers receive
 * the populated array — the field always exists so the client can render
 * without branching.
 *
 * Naming follows industry vocabulary (Tulip / Endear / Salesforce Scheduler):
 *   - "Show rate"        → showRatePct
 *   - "Conversion rate"  → conversionRatePct
 *   - "Revenue / appt"   → revenuePerAppointment
 *   - "AAV"              → averageAppointmentValue
 */

export interface AppointmentKpis {
  /** Total appointments inside the period (all statuses). */
  total: number;
  scheduled: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  noShow: number;
  rescheduled: number;

  /** completed / (completed + no_show) — % the customer actually arrived. */
  showRatePct: number;

  /** appointments with outcome = sale_closed / completed — sales conversion. */
  conversionRatePct: number;

  /** Aggregated revenue from orders.appointment_id, summed in MXN. */
  revenuePerAppointment: number;
  /** Sum of revenue from appointment-attributed orders. */
  totalAppointmentRevenue: number;
  /** AAV — avg order ticket for orders linked to an appointment. */
  averageAppointmentValue: number;
}

export interface OutcomeBreakdownEntry {
  outcomeCode: AppointmentOutcomeCode;
  count: number;
  pct: number;
}

export interface CancellationReasonBreakdownEntry {
  reason: AppointmentCancellationReason;
  count: number;
  pct: number;
}

export interface NoShowReasonBreakdownEntry {
  reason: AppointmentNoShowReason;
  count: number;
  pct: number;
}

export interface AppointmentTrendBucket {
  /** ISO week start `YYYY-MM-DD` (Monday). */
  weekStart: string;
  total: number;
  completed: number;
  revenue: number;
}

export interface TeamRankingEntry {
  userId: string;
  fullName: string;
  total: number;
  completed: number;
  showRatePct: number;
  conversionRatePct: number;
  revenue: number;
  averageAppointmentValue: number;
}

export interface AppointmentOverview {
  period: { from: string; to: string };
  kpis: AppointmentKpis;
  outcomes: OutcomeBreakdownEntry[];
  cancellationReasons: CancellationReasonBreakdownEntry[];
  noShowReasons: NoShowReasonBreakdownEntry[];
  trend: AppointmentTrendBucket[];
  /** Null for beauty_advisor (no peers visible). */
  teamRanking: TeamRankingEntry[] | null;
}
