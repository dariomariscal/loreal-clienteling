import type {
  VisitStatus,
  VisitChannel,
  VisitReason,
  BookedReason,
  VisitOutcome,
  VisitSentiment,
} from "../enums/customer-visits";

/** Product the customer examined or that was shown to them during a visit. */
export interface VisitProductView {
  productId: string;
  variantId?: string;
}

/**
 * Full customer visit record. The shape returned by GET /customer-visits/:id
 * and embedded in the customer timeline.
 */
export interface CustomerVisit {
  id: string;
  customerId: string;
  storeId: string;
  attendedByUserId: string;
  appointmentId: string | null;

  visitChannel: VisitChannel;
  visitNumber: number;

  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;

  bookedReason: BookedReason | null;
  visitReason: VisitReason | null;

  status: VisitStatus;
  outcome: VisitOutcome | null;

  partySize: number;
  sentiment: VisitSentiment | null;

  productsViewed: VisitProductView[] | null;
  notes: string | null;

  convertedOrderId: string | null;
  followUpDate: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payload when an advisor starts logging a visit. Walk-ins set
 * `appointmentId = null`; the visit materialized from a booking sets it.
 * `visitReason` is optional at start — the BA captures it at close-out
 * via the close payload below.
 */
export interface StartVisitPayload {
  customerId: string;
  appointmentId?: string;
  visitChannel?: VisitChannel;
  bookedReason?: BookedReason;
  partySize?: number;
  startedAt?: Date;
}

/**
 * Mid-visit updates (BA fixes a field while the visit is open).
 */
export interface UpdateVisitPayload {
  visitChannel?: VisitChannel;
  bookedReason?: BookedReason | null;
  partySize?: number;
  notes?: string;
  productsViewed?: VisitProductView[];
}

/**
 * Close-out payload. `visitReason` and `outcome` are required because they
 * are the analytics primary keys for "why did the customer come in" and
 * "what came of it".
 */
export interface CloseVisitPayload {
  visitReason: VisitReason;
  outcome: VisitOutcome;
  sentiment?: VisitSentiment;
  notes?: string;
  productsViewed?: VisitProductView[];
  convertedOrderId?: string;
  followUpDate?: Date;
  /** Defaults to `now()` on the server. Allows backfilling a paper log. */
  endedAt?: Date;
}

/** Filter shape for listing visits. */
export interface VisitListFilters {
  customerId?: string;
  storeId?: string;
  attendedByUserId?: string;
  status?: VisitStatus;
  visitReason?: VisitReason;
  from?: Date;
  to?: Date;
}
