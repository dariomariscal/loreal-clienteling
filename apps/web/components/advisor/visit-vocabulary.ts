import {
  VisitReason,
  VisitOutcome,
  VisitSentiment,
  VisitChannel,
  BookedReason,
} from "@loreal/contracts";

/**
 * Spanish vocabulary for the customer-visits surface. Mirrors the
 * customer-vocabulary.ts pattern: every label and badge variant the BA
 * surface uses for visits is centralized here so we don't drift.
 *
 * Translations follow the editorial tone the BA speaks (es-MX, intimate):
 * "Búsqueda" instead of "Browsing", "Reposición" instead of "Replenishment".
 */

type BadgeVariant =
  | "default"
  | "secondary"
  | "info"
  | "success"
  | "warning"
  | "destructive"
  | "outline";

// ── Visit reason (close-out chips) ───────────────────────────────────

const REASON_LABEL: Record<VisitReason, string> = {
  browsing: "Búsqueda",
  replenishment: "Reposición",
  new_purchase: "Nueva compra",
  gift: "Regalo",
  diagnostic: "Diagnóstico",
  fragrance_discovery: "Fragancia",
  makeup_lesson: "Lección de maquillaje",
  bridal_event_prep: "Boda o evento",
  return: "Devolución",
  complaint: "Reclamo",
  loyalty_redemption: "Canjear puntos",
  event_attendance: "Asistencia a evento",
  vip_private: "Atención VIP",
  click_collect_pickup: "Recoger pedido",
};

export function visitReasonLabel(
  reason: VisitReason | string | null | undefined,
): string {
  if (!reason) return "Sin motivo";
  return REASON_LABEL[reason as VisitReason] ?? reason;
}

/**
 * Display order for the close-out chip grid. Most common motives first so the
 * BA hits them with a thumb in landscape iPad orientation.
 */
export const VISIT_REASON_ORDER: VisitReason[] = [
  VisitReason.BROWSING,
  VisitReason.REPLENISHMENT,
  VisitReason.NEW_PURCHASE,
  VisitReason.GIFT,
  VisitReason.DIAGNOSTIC,
  VisitReason.FRAGRANCE_DISCOVERY,
  VisitReason.MAKEUP_LESSON,
  VisitReason.LOYALTY_REDEMPTION,
  VisitReason.CLICK_COLLECT_PICKUP,
  VisitReason.BRIDAL_EVENT_PREP,
  VisitReason.EVENT_ATTENDANCE,
  VisitReason.VIP_PRIVATE,
  VisitReason.RETURN,
  VisitReason.COMPLAINT,
];

// ── Booked reason (appointment-bound subset) ─────────────────────────

const BOOKED_REASON_LABEL: Record<BookedReason, string> = {
  new_purchase: "Nueva compra",
  replenishment: "Reposición",
  gift: "Regalo",
  diagnostic: "Diagnóstico",
  fragrance_discovery: "Fragancia",
  makeup_lesson: "Lección de maquillaje",
  bridal_event_prep: "Boda o evento",
  loyalty_redemption: "Canjear puntos",
  event_attendance: "Asistencia a evento",
  vip_private: "Atención VIP",
  click_collect_pickup: "Recoger pedido",
};

export function bookedReasonLabel(
  reason: BookedReason | string | null | undefined,
): string {
  if (!reason) return "Sin motivo";
  return BOOKED_REASON_LABEL[reason as BookedReason] ?? reason;
}

// ── Visit outcome (segmented control) ────────────────────────────────

interface OutcomeMeta {
  label: string;
  variant: BadgeVariant;
}

const OUTCOME_META: Record<VisitOutcome, OutcomeMeta> = {
  purchased: { label: "Compró", variant: "success" },
  no_purchase: { label: "Sin compra", variant: "secondary" },
  sample_given: { label: "Muestra entregada", variant: "info" },
  followup_needed: { label: "Seguimiento", variant: "warning" },
  return_processed: { label: "Devolución", variant: "destructive" },
};

export function visitOutcomeLabel(
  outcome: VisitOutcome | string | null | undefined,
): string {
  if (!outcome) return "Sin desenlace";
  return (
    OUTCOME_META[outcome as VisitOutcome]?.label ?? outcome
  );
}

export function visitOutcomeMeta(
  outcome: VisitOutcome | string | null | undefined,
): OutcomeMeta {
  if (!outcome) return { label: "Sin desenlace", variant: "secondary" };
  return (
    OUTCOME_META[outcome as VisitOutcome] ?? {
      label: outcome,
      variant: "secondary",
    }
  );
}

/** Order shown in the segmented control of CloseVisitSheet. */
export const VISIT_OUTCOME_ORDER: VisitOutcome[] = [
  VisitOutcome.PURCHASED,
  VisitOutcome.NO_PURCHASE,
  VisitOutcome.SAMPLE_GIVEN,
  VisitOutcome.FOLLOWUP_NEEDED,
  VisitOutcome.RETURN_PROCESSED,
];

// ── Sentiment (emoji row) ────────────────────────────────────────────

interface SentimentMeta {
  label: string;
  emoji: string;
}

const SENTIMENT_META: Record<VisitSentiment, SentimentMeta> = {
  positive: { label: "Contenta", emoji: "😊" },
  neutral: { label: "Neutral", emoji: "😐" },
  negative: { label: "Inconforme", emoji: "😞" },
};

export function visitSentimentMeta(
  sentiment: VisitSentiment | string | null | undefined,
): SentimentMeta | null {
  if (!sentiment) return null;
  return SENTIMENT_META[sentiment as VisitSentiment] ?? null;
}

/** Order shown in the emoji row, left → right. */
export const VISIT_SENTIMENT_ORDER: VisitSentiment[] = [
  VisitSentiment.NEGATIVE,
  VisitSentiment.NEUTRAL,
  VisitSentiment.POSITIVE,
];

// ── Channel ──────────────────────────────────────────────────────────

const CHANNEL_LABEL: Record<VisitChannel, string> = {
  in_store: "En tienda",
  virtual: "Virtual",
  phone: "Teléfono",
  whatsapp: "WhatsApp",
};

export function visitChannelLabel(
  channel: VisitChannel | string | null | undefined,
): string {
  if (!channel) return "En tienda";
  return CHANNEL_LABEL[channel as VisitChannel] ?? channel;
}

// ── Follow-up presets ────────────────────────────────────────────────
// Quick chips for the close-out sheet so the BA never opens a date picker
// for the most common cases. Patterns lifted from Salesfloor / Endear.

export interface FollowupPreset {
  id: string;
  label: string;
  /** Returns the ISO date the chip resolves to, given an anchor (today). */
  resolve: (now: Date) => Date;
}

export const FOLLOWUP_PRESETS: FollowupPreset[] = [
  {
    id: "in_2w",
    label: "En 2 semanas",
    resolve: (now) => addDays(now, 14),
  },
  {
    id: "in_1m",
    label: "En 1 mes",
    resolve: (now) => addDays(now, 30),
  },
  {
    id: "in_3m",
    label: "En 3 meses",
    resolve: (now) => addDays(now, 90),
  },
];

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  out.setHours(10, 0, 0, 0);
  return out;
}

// ── Duration helper ──────────────────────────────────────────────────

/**
 * "14 min", "1 h 12 min". Used by the pill and the close-out header. We
 * keep it here so timeline rows, the pill, and the visits tab agree on
 * the format.
 */
export function formatVisitDuration(startedAt: Date | string, endedAt?: Date | string | null): string {
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date();
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
