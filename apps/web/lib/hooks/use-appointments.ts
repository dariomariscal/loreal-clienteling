import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  CreateAppointment,
  CreateAppointmentSeries,
  UpdateAppointment,
  CancelAppointment,
  CancelAppointmentSeries,
  MarkAppointmentNoShow,
  ConfirmAppointmentByCustomer,
  CheckOutAppointment,
} from "@loreal/contracts";

// ── Types ──────────────────────────────────────────────────────────

export interface AppointmentPreForm {
  goals?: string[];
  concerns?: string[];
  allergies?: string[];
  notes?: string;
}

export interface AppointmentServiceOutcome {
  productsUsed?: string[];
  satisfactionScore?: number;
  notes?: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  staffUserId: string;
  storeId: string;
  serviceTypeId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: string;
  notes: string | null;
  preForm: AppointmentPreForm | null;
  serviceOutcome: AppointmentServiceOutcome | null;
  outcomeCode: string | null;
  reminderSentAt: string | null;
  confirmationSentAt: string | null;
  confirmedByCustomerAt: string | null;
  cancelledAt: string | null;
  cancelledByUserId: string | null;
  cancellationReason: string | null;
  noShowReason: string | null;
  isVirtual: boolean;
  meetingUrl: string | null;
  rescheduledFromAppointmentId: string | null;
  seriesId: string | null;
  seriesSequence: number | null;
  createdAt: string;
  updatedAt: string;
}

// ── Query keys ─────────────────────────────────────────────────────

const appointmentKeys = {
  all: (from?: string, to?: string, staffUserId?: string) =>
    ["appointments", from, to, staffUserId] as const,
  calendar: (
    from: string,
    to: string,
    staffUserId?: string,
    storeView?: boolean,
  ) =>
    ["appointments", "calendar", from, to, staffUserId, storeView] as const,
  detail: (id: string) => ["appointments", id] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useAppointments(
  from?: string,
  to?: string,
  options?: { staffUserId?: string },
) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  if (options?.staffUserId) params.staffUserId = options.staffUserId;

  return useQuery({
    queryKey: appointmentKeys.all(from, to, options?.staffUserId),
    queryFn: () => api.get<Appointment[]>("/appointments", params),
  });
}

export interface CalendarAppointment {
  id: string;
  startTime: string;
  durationMinutes: number;
  serviceTypeId: string;
  serviceTypeName: string | null;
  serviceTypeColor: string | null;
  status: string;
  notes: string | null;
  isVirtual: boolean;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerLifecycleStage: string | null;
  staffUserId: string;
  staffName: string;
  storeId: string;
  storeName: string;
}

export function useAppointmentCalendar(
  from: string,
  to: string,
  options?: { staffUserId?: string; storeView?: boolean },
) {
  const params: Record<string, string> = { from, to };
  if (options?.staffUserId) params.staffUserId = options.staffUserId;
  if (options?.storeView) params.storeView = "true";

  return useQuery({
    queryKey: appointmentKeys.calendar(
      from,
      to,
      options?.staffUserId,
      options?.storeView,
    ),
    queryFn: () =>
      api.get<CalendarAppointment[]>("/appointments/calendar", params),
    enabled: !!from && !!to,
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: () => api.get<Appointment>(`/appointments/${id}`),
    enabled: !!id,
  });
}

// Availability hooks (`useAvailabilityDays` / `useAvailabilitySlots`) live in
// `use-customer-profile.ts` to avoid duplicate exports — they accept an
// optional `serviceTypeId` so the booking engine applies the right policy.

// ── Mutations ──────────────────────────────────────────────────────

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAppointment) =>
      api.post<Appointment>("/appointments", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateAppointment) =>
      api.patch<Appointment>(`/appointments/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & CancelAppointment) =>
      api.post<Appointment>(`/appointments/${id}/cancel`, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: appointmentKeys.detail(updated.id) });
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useMarkAppointmentNoShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & MarkAppointmentNoShow) =>
      api.post<Appointment>(`/appointments/${id}/no-show`, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: appointmentKeys.detail(updated.id) });
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useConfirmAppointmentByCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & ConfirmAppointmentByCustomer) =>
      api.post<Appointment>(`/appointments/${id}/confirm`, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: appointmentKeys.detail(updated.id) });
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useCheckInAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.post<Appointment>(`/appointments/${id}/check-in`, {}),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: appointmentKeys.detail(updated.id) });
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useCreateAppointmentSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAppointmentSeries) =>
      api.post<{ seriesId: string; occurrences: Appointment[] }>(
        "/appointments/series",
        data,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useCancelAppointmentSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & CancelAppointmentSeries) =>
      api.post<unknown>(`/appointments/${id}/cancel-series`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useCheckOutAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & CheckOutAppointment) =>
      api.post<Appointment>(`/appointments/${id}/check-out`, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: appointmentKeys.detail(updated.id) });
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}
