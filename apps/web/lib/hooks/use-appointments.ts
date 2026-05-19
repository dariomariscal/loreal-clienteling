import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CreateAppointment, UpdateAppointment } from "@loreal/contracts";

// ── Types ──────────────────────────────────────────────────────────

export interface Appointment {
  id: string;
  customerId: string;
  baUserId: string;
  storeId: string;
  eventTypeId: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  comments: string | null;
  reminderSentAt: string | null;
  confirmationSentAt: string | null;
  isVirtual: boolean;
  videoLink: string | null;
  rescheduledFromAppointmentId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Query keys ─────────────────────────────────────────────────────

const appointmentKeys = {
  all: (from?: string, to?: string) => ["appointments", from, to] as const,
  calendar: (from: string, to: string, baUserId?: string, storeView?: boolean) =>
    ["appointments", "calendar", from, to, baUserId, storeView] as const,
  detail: (id: string) => ["appointments", id] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useAppointments(from?: string, to?: string) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;

  return useQuery({
    queryKey: appointmentKeys.all(from, to),
    queryFn: () => api.get<Appointment[]>("/appointments", params),
  });
}

export interface CalendarAppointment {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  eventTypeId: string;
  eventTypeName: string | null;
  eventTypeColor: string | null;
  status: string;
  comments: string | null;
  isVirtual: boolean;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerSegment: string | null;
  baUserId: string;
  baName: string;
  storeId: string;
  storeName: string;
}

export function useAppointmentCalendar(
  from: string,
  to: string,
  options?: { baUserId?: string; storeView?: boolean },
) {
  const params: Record<string, string> = { from, to };
  if (options?.baUserId) params.baUserId = options.baUserId;
  if (options?.storeView) params.storeView = "true";

  return useQuery({
    queryKey: appointmentKeys.calendar(from, to, options?.baUserId, options?.storeView),
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
