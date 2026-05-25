import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

// ── Types ──────────────────────────────────────────────────────────

export interface MessageTemplate {
  id: string;
  brandId: string | null;
  name: string;
  channel: string;
  body: string;
  campaignType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Query keys ─────────────────────────────────────────────────────

const templateKeys = {
  all: ["templates"] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useTemplates() {
  return useQuery({
    queryKey: templateKeys.all,
    queryFn: () => api.get<MessageTemplate[]>("/messages/templates"),
  });
}

// ── Mutations ──────────────────────────────────────────────────────

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      brandId?: string;
      name: string;
      channel: string;
      body: string;
      campaignType: string;
    }) => api.post<MessageTemplate>("/messages/templates", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templateKeys.all }),
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Pick<MessageTemplate, "name" | "channel" | "body" | "campaignType" | "isActive">>) =>
      api.patch<MessageTemplate>(`/messages/templates/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templateKeys.all }),
  });
}
