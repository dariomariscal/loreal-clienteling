import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getAuthToken } from "@/lib/api-client";
import { API_URL } from "@/lib/constants";
import type {
  CustomerAiSummary,
  SuggestedActionWithCustomer,
  ExtractedNote,
  MessageSuggestion,
  SemanticSearchResult,
} from "@loreal/contracts";

// ── Query keys ─────────────────────────────────────────────────────

const aiKeys = {
  summary: (customerId: string) => ["ai", "summary", customerId] as const,
  suggestedActions: (dueDate: string, limit: number) =>
    ["ai", "suggested-actions", dueDate, limit] as const,
  search: (query: string, limit: number) => ["ai", "search", query, limit] as const,
};

// ── Customer AI summary ────────────────────────────────────────────

export function useCustomerSummary(customerId: string) {
  return useQuery({
    queryKey: aiKeys.summary(customerId),
    queryFn: () => api.get<CustomerAiSummary>(`/customers/${customerId}/ai-summary`),
    enabled: !!customerId,
    // Backend already caches with TTL — short stale time on the client
    // keeps the UI from refetching during a single profile session.
    staleTime: 5 * 60 * 1000,
  });
}

export function useRegenerateCustomerSummary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) =>
      api.post<CustomerAiSummary>(`/customers/${customerId}/ai-summary/regenerate`, {}),
    onSuccess: (data, customerId) => {
      queryClient.setQueryData(aiKeys.summary(customerId), data);
    },
  });
}

// ── Daily suggested actions ────────────────────────────────────────

export function useDailySuggestedActions(dueDate?: string, limit = 5) {
  const date = dueDate ?? new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: aiKeys.suggestedActions(date, limit),
    queryFn: () =>
      api.get<SuggestedActionWithCustomer[]>("/suggested-actions/daily", {
        dueDate: date,
        limit: String(limit),
      }),
  });
}

export function useDismissSuggestedAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (suggestedActionId: string) =>
      api.post(`/suggested-actions/${suggestedActionId}/dismiss`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai", "suggested-actions"] }),
  });
}

export function useCompleteSuggestedAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (suggestedActionId: string) =>
      api.post(`/suggested-actions/${suggestedActionId}/complete`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai", "suggested-actions"] }),
  });
}

// ── Consolidated NBA queue (Counter Manager view) ─────────────────

/** Row in the consolidated counter NBA inbox. */
export interface StoreSuggestedAction {
  id: string;
  customerId: string;
  assignedToUserId: string;
  assignedTo: {
    id: string;
    name: string | null;
    specialty: string | null;
  };
  dueDate: string;
  triggerType: string;
  description: string;
  recommendedAction: string;
  suggestedMessageDraft: string | null;
  priority: number;
  createdAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    lifecycleStage: string | null;
    loyaltyTier: string | null;
    lastInteractionAt: string | null;
    lastOrderAt: string | null;
  };
}

export interface StoreSuggestedActionsParams {
  storeId?: string;
  dueDate?: string;
  assignedToUserIds?: string[];
  limit?: number;
}

export function useStoreSuggestedActions(
  params: StoreSuggestedActionsParams = {},
) {
  const query: Record<string, string> = {};
  if (params.storeId) query.storeId = params.storeId;
  if (params.dueDate) query.dueDate = params.dueDate;
  if (params.limit) query.limit = String(params.limit);
  if (params.assignedToUserIds && params.assignedToUserIds.length > 0) {
    // Backend accepts either a single value or an array; comma-join is
    // friendlier to URLSearchParams than repeated keys.
    query.assignedToUserIds = params.assignedToUserIds.join(",");
  }

  return useQuery({
    queryKey: ["ai", "suggested-actions", "store", params] as const,
    queryFn: () =>
      api.get<StoreSuggestedAction[]>("/suggested-actions/store", query),
  });
}

// ── Semantic search ────────────────────────────────────────────────

export function useSemanticSearch(query: string, limit = 10) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: aiKeys.search(trimmed, limit),
    queryFn: () =>
      api.get<SemanticSearchResult[]>("/customers/semantic-search", {
        q: trimmed,
        limit: String(limit),
      }),
    enabled: trimmed.length >= 3,
    // Semantic search is expensive — keep results around for the session.
    staleTime: 60 * 1000,
  });
}

// ── Message suggestions ────────────────────────────────────────────

export function useGenerateMessageSuggestions() {
  return useMutation({
    mutationFn: (customerId: string) =>
      api.post<MessageSuggestion[]>(`/customers/${customerId}/message-suggestions`, {}),
  });
}

// ── Note extraction ────────────────────────────────────────────────

interface ExtractFromTextInput {
  rawText: string;
  customerId?: string;
  language?: string;
}

interface NoteExtractionResult {
  transcript: string;
  extracted: ExtractedNote;
}

export function useExtractNoteFromText() {
  return useMutation({
    mutationFn: (input: ExtractFromTextInput) =>
      api.post<NoteExtractionResult>("/notes/extract", input),
  });
}

interface ExtractFromAudioInput {
  audio: Blob;
  mimeType: string;
  customerId?: string;
  language?: string;
}

// Audio uploads bypass the JSON api client because they go as multipart.
// Reuses the shared Clerk token resolver so auth stays consistent.
export function useExtractNoteFromAudio() {
  return useMutation({
    mutationFn: async (input: ExtractFromAudioInput): Promise<NoteExtractionResult> => {
      const token = await getAuthToken();

      const form = new FormData();
      form.append("audio", input.audio, "note.webm");
      if (input.customerId) form.append("customerId", input.customerId);
      if (input.language) form.append("language", input.language);

      const res = await fetch(`${API_URL}/notes/extract/audio`, {
        method: "POST",
        body: form,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        throw new Error(`Audio extraction failed: ${res.status}`);
      }
      return (await res.json()) as NoteExtractionResult;
    },
  });
}
