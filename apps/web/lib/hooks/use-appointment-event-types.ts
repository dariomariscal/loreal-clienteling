import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface AppointmentEventType {
  id: string;
  code: string;
  displayName: string;
  durationMinutes: number | null;
  color: string | null;
  description: string | null;
  brandId: string | null;
  maxCapacity: number | null;
  requiresConfirmation: boolean;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const eventTypeKeys = {
  all: ["appointment-event-types"] as const,
};

export function useAppointmentEventTypes() {
  return useQuery({
    queryKey: eventTypeKeys.all,
    queryFn: () => api.get<AppointmentEventType[]>("/appointment-event-types"),
  });
}
