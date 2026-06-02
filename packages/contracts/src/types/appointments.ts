import type {
  AppointmentCancellationReason,
  AppointmentNoShowReason,
  AppointmentOutcomeCode,
} from "../enums/appointment";

/**
 * Pre-appointment briefing surfaced by the customer (form responses, allergies,
 * goals). Kept loose because each brand may add fields via the dynamic form
 * builder; the booking engine never reads this — only the BA detail screen does.
 */
export interface AppointmentPreForm {
  goals?: string[];
  concerns?: string[];
  allergies?: string[];
  notes?: string;
}

/**
 * Free-form outcome details captured at check-out (productsUsed, satisfaction).
 * The queryable enum lives in `outcomeCode`; this jsonb is the long tail.
 */
export interface AppointmentServiceOutcome {
  productsUsed?: string[];
  satisfactionScore?: number;
  notes?: string;
}

export interface CreateAppointment {
  customerId: string;
  serviceTypeId: string;
  startTime: Date;
  durationMinutes: number;
  notes?: string;
  isVirtual?: boolean;
  meetingUrl?: string;
  preForm?: AppointmentPreForm;
  /** When part of a recurring series. */
  seriesId?: string;
  seriesSequence?: number;
}

export interface UpdateAppointment {
  status?: string;
  startTime?: Date;
  durationMinutes?: number;
  notes?: string;
  preForm?: AppointmentPreForm;
  serviceOutcome?: AppointmentServiceOutcome;
  outcomeCode?: AppointmentOutcomeCode;
  confirmedByCustomerAt?: Date;
  cancelledAt?: Date;
  cancelledByUserId?: string;
  cancellationReason?: AppointmentCancellationReason;
  noShowReason?: AppointmentNoShowReason;
}

/** POST /appointments/:id/cancel */
export interface CancelAppointment {
  reason: AppointmentCancellationReason;
  notes?: string;
}

/** POST /appointments/:id/no-show */
export interface MarkAppointmentNoShow {
  reason: AppointmentNoShowReason;
  notes?: string;
}

/** POST /appointments/:id/confirm — customer reply YES handler. */
export interface ConfirmAppointmentByCustomer {
  /** Defaults to now when omitted. */
  confirmedAt?: Date;
}

/** POST /appointments/:id/check-in — BA marks the customer as arrived. */
export interface CheckInAppointment {
  notes?: string;
}

/** POST /appointments/:id/check-out — close the appointment with outcome. */
export interface CheckOutAppointment {
  outcomeCode: AppointmentOutcomeCode;
  serviceOutcome?: AppointmentServiceOutcome;
  notes?: string;
}

export interface AvailabilityDay {
  /** ISO date `YYYY-MM-DD` in the store's timezone (assumed America/Mexico_City for v1). */
  date: string;
  hasAvailability: boolean;
}

export interface AvailabilitySlot {
  /** ISO instant when the slot starts. */
  startsAt: string;
  /** ISO instant when the slot ends (startsAt + requested durationMinutes). */
  endsAt: string;
  /** Always true in the response — booked slots are omitted entirely, not greyed out. */
  available: boolean;
}
