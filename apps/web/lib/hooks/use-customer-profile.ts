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
  CustomerNote,
  CreateCustomerNote,
  UpdateCustomerNote,
  AvailabilityDay,
  AvailabilitySlot,
} from "@loreal/contracts";

// ── Query keys ─────────────────────────────────────────────────────

const profileKeys = {
  metrics: (id: string) => ["customers", id, "metrics"] as const,
  activity: (id: string) => ["customers", id, "activity"] as const,
  notes: (id: string) => ["customers", id, "notes"] as const,
  availability: (
    baUserId: string,
    from: string,
    to: string,
    durationMinutes: number,
  ) =>
    [
      "appointments",
      "availability",
      "days",
      baUserId,
      from,
      to,
      durationMinutes,
    ] as const,
  availabilitySlots: (
    baUserId: string,
    date: string,
    durationMinutes: number,
  ) =>
    [
      "appointments",
      "availability",
      "slots",
      baUserId,
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
      api.get<CustomerNote[]>(`/customers/${customerId}/notes`),
    enabled: !!customerId,
  });
}

export function useCreateCustomerNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      customerId,
      ...data
    }: { customerId: string } & CreateCustomerNote) =>
      api.post<CustomerNote>(`/customers/${customerId}/notes`, data),
    onSuccess: (_, { customerId }) => {
      qc.invalidateQueries({ queryKey: profileKeys.notes(customerId) });
      // A new note also belongs in the activity timeline.
      qc.invalidateQueries({ queryKey: profileKeys.activity(customerId) });
    },
  });
}

export function useUpdateCustomerNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      customerId: _customerId,
      ...data
    }: { id: string; customerId: string } & UpdateCustomerNote) =>
      api.patch<CustomerNote>(`/customer-notes/${id}`, data),
    onSuccess: (_, { customerId }) =>
      qc.invalidateQueries({ queryKey: profileKeys.notes(customerId) }),
  });
}

export function useDeleteCustomerNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; customerId: string }) =>
      api.delete(`/customer-notes/${id}`),
    onSuccess: (_, { customerId }) =>
      qc.invalidateQueries({ queryKey: profileKeys.notes(customerId) }),
  });
}

// ── Appointment availability ───────────────────────────────────────

export function useAvailabilityDays(params: {
  baUserId: string;
  from: string;
  to: string;
  durationMinutes: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: profileKeys.availability(
      params.baUserId,
      params.from,
      params.to,
      params.durationMinutes,
    ),
    queryFn: () =>
      api.get<AvailabilityDay[]>("/appointments/availability", {
        baUserId: params.baUserId,
        from: params.from,
        to: params.to,
        durationMinutes: String(params.durationMinutes),
      }),
    enabled:
      params.enabled !== false &&
      !!params.baUserId &&
      !!params.from &&
      !!params.to &&
      params.durationMinutes > 0,
  });
}

export function useAvailabilitySlots(params: {
  baUserId: string;
  date: string;
  durationMinutes: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: profileKeys.availabilitySlots(
      params.baUserId,
      params.date,
      params.durationMinutes,
    ),
    queryFn: () =>
      api.get<AvailabilitySlot[]>("/appointments/availability/slots", {
        baUserId: params.baUserId,
        date: params.date,
        durationMinutes: String(params.durationMinutes),
      }),
    enabled:
      params.enabled !== false &&
      !!params.baUserId &&
      !!params.date &&
      params.durationMinutes > 0,
  });
}
