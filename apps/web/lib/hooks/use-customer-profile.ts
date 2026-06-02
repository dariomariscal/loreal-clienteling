import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  CustomerMetrics,
  CustomerActivityResponse,
  Note,
  CreateNote,
  UpdateNote,
  AvailabilityDay,
  AvailabilitySlot,
} from "@loreal/contracts";

// ── Query keys ─────────────────────────────────────────────────────

const profileKeys = {
  metrics: (id: string) => ["customers", id, "metrics"] as const,
  activity: (id: string) => ["customers", id, "activity"] as const,
  notes: (id: string) => ["customers", id, "notes"] as const,
  availability: (
    staffUserId: string,
    from: string,
    to: string,
    durationMinutes: number,
  ) =>
    [
      "appointments",
      "availability",
      "days",
      staffUserId,
      from,
      to,
      durationMinutes,
    ] as const,
  availabilitySlots: (
    staffUserId: string,
    date: string,
    durationMinutes: number,
  ) =>
    [
      "appointments",
      "availability",
      "slots",
      staffUserId,
      date,
      durationMinutes,
    ] as const,
};

// ── Metrics ────────────────────────────────────────────────────────

export function useCustomerMetrics(customerId: string) {
  return useQuery({
    queryKey: profileKeys.metrics(customerId),
    queryFn: () =>
      api.get<CustomerMetrics>(`/customers/${customerId}/metrics`),
    enabled: !!customerId,
    // Header KPIs reload often — keep them quick but cache 30s so a tab
    // switch doesn't refetch.
    staleTime: 30_000,
  });
}

// ── Activity timeline ──────────────────────────────────────────────

export function useCustomerActivity(customerId: string, pageSize = 20) {
  return useInfiniteQuery<
    CustomerActivityResponse,
    Error,
    { pages: CustomerActivityResponse[]; pageParams: (string | null)[] },
    ReturnType<typeof profileKeys.activity>,
    string | null
  >({
    queryKey: profileKeys.activity(customerId),
    queryFn: ({ pageParam }) => {
      const params: Record<string, string> = { limit: String(pageSize) };
      if (pageParam) params.before = pageParam;
      return api.get<CustomerActivityResponse>(
        `/customers/${customerId}/activity`,
        params,
      );
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!customerId,
  });
}

// ── Notes ──────────────────────────────────────────────────────────

export function useCustomerNotes(customerId: string) {
  return useQuery({
    queryKey: profileKeys.notes(customerId),
    queryFn: () =>
      api.get<Note[]>(`/customers/${customerId}/notes`),
    enabled: !!customerId,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      customerId,
      ...data
    }: { customerId: string } & CreateNote) =>
      api.post<Note>(`/customers/${customerId}/notes`, data),
    onSuccess: (_, { customerId }) => {
      qc.invalidateQueries({ queryKey: profileKeys.notes(customerId) });
      // A new note also belongs in the activity timeline.
      qc.invalidateQueries({ queryKey: profileKeys.activity(customerId) });
    },
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      customerId: _customerId,
      ...data
    }: { id: string; customerId: string } & UpdateNote) =>
      api.patch<Note>(`/notes/${id}`, data),
    onSuccess: (_, { customerId }) =>
      qc.invalidateQueries({ queryKey: profileKeys.notes(customerId) }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; customerId: string }) =>
      api.delete(`/notes/${id}`),
    onSuccess: (_, { customerId }) =>
      qc.invalidateQueries({ queryKey: profileKeys.notes(customerId) }),
  });
}

// ── Appointment availability ───────────────────────────────────────

export function useAvailabilityDays(params: {
  staffUserId: string;
  from: string;
  to: string;
  durationMinutes: number;
  /** Pass the service id so buffers / lead time / policy apply. */
  serviceTypeId?: string;
  enabled?: boolean;
}) {
  const query: Record<string, string> = {
    staffUserId: params.staffUserId,
    from: params.from,
    to: params.to,
    durationMinutes: String(params.durationMinutes),
  };
  if (params.serviceTypeId) query.serviceTypeId = params.serviceTypeId;

  return useQuery({
    queryKey: [
      ...profileKeys.availability(
        params.staffUserId,
        params.from,
        params.to,
        params.durationMinutes,
      ),
      params.serviceTypeId ?? null,
    ] as const,
    queryFn: () =>
      api.get<AvailabilityDay[]>("/appointments/availability", query),
    enabled:
      params.enabled !== false &&
      !!params.staffUserId &&
      !!params.from &&
      !!params.to &&
      params.durationMinutes > 0,
  });
}

export function useAvailabilitySlots(params: {
  staffUserId: string;
  date: string;
  durationMinutes: number;
  serviceTypeId?: string;
  enabled?: boolean;
}) {
  const query: Record<string, string> = {
    staffUserId: params.staffUserId,
    date: params.date,
    durationMinutes: String(params.durationMinutes),
  };
  if (params.serviceTypeId) query.serviceTypeId = params.serviceTypeId;

  return useQuery({
    queryKey: [
      ...profileKeys.availabilitySlots(
        params.staffUserId,
        params.date,
        params.durationMinutes,
      ),
      params.serviceTypeId ?? null,
    ] as const,
    queryFn: () =>
      api.get<AvailabilitySlot[]>(
        "/appointments/availability/slots",
        query,
      ),
    enabled:
      params.enabled !== false &&
      !!params.staffUserId &&
      !!params.date &&
      params.durationMinutes > 0,
  });
}
