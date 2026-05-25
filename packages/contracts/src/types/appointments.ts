export interface CreateAppointment {
  customerId: string;
  serviceTypeId: string;
  startTime: Date;
  durationMinutes: number;
  notes?: string;
  isVirtual?: boolean;
  meetingUrl?: string;
}

export interface UpdateAppointment {
  status?: string;
  startTime?: Date;
  durationMinutes?: number;
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
