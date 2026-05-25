import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { z } from "zod";
import type {
  createEventSchema,
  updateEventSchema,
  listEventsQuerySchema,
  updateRsvpSchema,
} from "@/lib/schemas/events";

// ── Types ──────────────────────────────────────────────────────────

export type EventKind =
  | "masterclass"
  | "launch"
  | "vip_preview"
  | "trunk_show"
  | "discovery";

export type EventStatus = "scheduled" | "live" | "completed" | "cancelled";

export type RsvpStatus = "pending" | "accepted" | "declined" | "waitlist";

export interface StoreEvent {
  id: string;
  storeId: string;
  brandId: string | null;
  name: string;
  description: string | null;
  kind: EventKind;
  startTime: string;
  endTime: string;
  capacity: number | null;
  coverImageUrl: string | null;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StoreEventStats {
  invited: number;
  accepted: number;
  declined: number;
  waitlist: number;
  attended: number;
}

export interface StoreEventDetail extends StoreEvent {
  stats: StoreEventStats;
}

export interface EventInvitation {
  id: string;
  customerId: string;
  invitedByUserId: string;
  rsvpStatus: RsvpStatus;
  rsvpAt: string | null;
  attendedAt: string | null;
  createdAt: string;
  customerFirstName: string;
  customerLastName: string;
  customerTier: string | null;
}

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
export type UpdateRsvpInput = z.infer<typeof updateRsvpSchema>;

// ── Query keys ─────────────────────────────────────────────────────

const eventKeys = {
  list: (query: ListEventsQuery) => ["events", "list", query] as const,
  detail: (id: string) => ["events", id] as const,
  invitees: (id: string) => ["events", id, "invitees"] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useEvents(query: ListEventsQuery = {}) {
  const params: Record<string, string> = {};
  if (query.storeId) params.storeId = query.storeId;
  if (query.brandId) params.brandId = query.brandId;
  if (query.status) params.status = query.status;
  if (query.from) params.from = query.from;
  if (query.to) params.to = query.to;

  return useQuery({
    queryKey: eventKeys.list(query),
    queryFn: () => api.get<StoreEvent[]>("/events", params),
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => api.get<StoreEventDetail>(`/events/${id}`),
    enabled: !!id,
  });
}

export function useEventInvitees(id: string) {
  return useQuery({
    queryKey: eventKeys.invitees(id),
    queryFn: () => api.get<EventInvitation[]>(`/events/${id}/invitees`),
    enabled: !!id,
  });
}

// ── Mutations ──────────────────────────────────────────────────────

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEventInput) => api.post<StoreEvent>("/events", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateEventInput) =>
      api.patch<StoreEvent>(`/events/${id}`, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: eventKeys.detail(updated.id) });
      qc.invalidateQueries({ queryKey: ["events", "list"] });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ id: string; deleted: true }>(`/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useInviteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      customerId,
    }: {
      eventId: string;
      customerId: string;
    }) =>
      api.post<EventInvitation>(`/events/${eventId}/invitees`, { customerId }),
    onSuccess: (_inv, vars) => {
      qc.invalidateQueries({ queryKey: eventKeys.invitees(vars.eventId) });
      qc.invalidateQueries({ queryKey: eventKeys.detail(vars.eventId) });
    },
  });
}

export function useInviteCustomersBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      customerIds,
    }: {
      eventId: string;
      customerIds: string[];
    }) =>
      api.post<{ inserted: number; skipped: number }>(
        `/events/${eventId}/invitees/bulk`,
        { customerIds },
      ),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: eventKeys.invitees(vars.eventId) });
      qc.invalidateQueries({ queryKey: eventKeys.detail(vars.eventId) });
    },
  });
}

export function useUpdateRsvp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      invitationId,
      ...data
    }: { eventId: string; invitationId: string } & UpdateRsvpInput) =>
      api.patch<EventInvitation>(
        `/events/${eventId}/invitees/${invitationId}/rsvp`,
        data,
      ),
    onSuccess: (_inv, vars) => {
      qc.invalidateQueries({ queryKey: eventKeys.invitees(vars.eventId) });
      qc.invalidateQueries({ queryKey: eventKeys.detail(vars.eventId) });
    },
  });
}

export function useMarkAttended() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      invitationId,
    }: {
      eventId: string;
      invitationId: string;
    }) =>
      api.post<EventInvitation>(
        `/events/${eventId}/invitees/${invitationId}/attended`,
        {},
      ),
    onSuccess: (_inv, vars) => {
      qc.invalidateQueries({ queryKey: eventKeys.invitees(vars.eventId) });
      qc.invalidateQueries({ queryKey: eventKeys.detail(vars.eventId) });
    },
  });
}

export function useRemoveInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      invitationId,
    }: {
      eventId: string;
      invitationId: string;
    }) =>
      api.delete<{ id: string; deleted: true }>(
        `/events/${eventId}/invitees/${invitationId}`,
      ),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: eventKeys.invitees(vars.eventId) });
      qc.invalidateQueries({ queryKey: eventKeys.detail(vars.eventId) });
    },
  });
}
