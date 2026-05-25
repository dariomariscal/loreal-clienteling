import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CreateAppointment, UpdateAppointment } from "@loreal/contracts";

// ── Types ──────────────────────────────────────────────────────────

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
  reminderSentAt: string | null;
  confirmationSentAt: string | null;
  isVirtual: boolean;
  meetingUrl: string | null;
  rescheduledFromAppointmentId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Query keys ─────────────────────────────────────────────────────

const appointmentKeys = {
  all: (from?: string, to?: string, staffUserId?: string) =>
    ["appointments", from, to, staffUserId] as const,
  calendar: (from: string, to: string, staffUserId?: string, storeView?: boolean) =>
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
    queryKey: appointmentKeys.calendar(from, to, options?.staffUserId, options?.storeView),
    queryFn: () => api.get<CalendarAppointment[]>("/appointments/calendar", params),
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
