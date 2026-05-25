import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Message } from "./use-customer-detail";
import type { CreateMessage } from "@loreal/contracts";

// ── Query keys ─────────────────────────────────────────────────────

const messageKeys = {
  all: ["messages"] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useMessages() {
  return useQuery({
    queryKey: messageKeys.all,
    queryFn: () => api.get<Message[]>("/messages"),
  });
}

// ── Mutations ──────────────────────────────────────────────────────

export function useCreateMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMessage) =>
      api.post<Message>("/messages", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messageKeys.all });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdateMessageTracking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      deliveredAt?: string;
      readAt?: string;
      respondedAt?: string;
    }) => api.patch<Message>(`/messages/${id}/tracking`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: messageKeys.all }),
  });
}
