import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { z } from "zod";
import type {
  listTasksQuerySchema,
  snoozeTaskSchema,
} from "@/lib/schemas/tasks";

// ── Types ──────────────────────────────────────────────────────────

export interface TaskProduct {
  id: string;
  title: string;
  brandName: string | null;
  images: string[];
}

export interface Task {
  id: string;
  customerId: string;
  assignedToUserId: string;
  dueDate: string;
  triggerType: string;
  description: string;
  recommendedAction: string;
  suggestedMessageDraft: string | null;
  productId: string | null;
  serviceTypeId: string | null;
  priority: number;
  expiresAt: string | null;
  dismissedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  customerFirstName: string;
  customerLastName: string;
  customerTier: string | null;
  /** Resolved product when triggerType is product-bound. */
  product: TaskProduct | null;
}

export interface TaskCounts {
  pending: number;
  completed: number;
  dismissed: number;
}

export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type SnoozeTaskInput = z.infer<typeof snoozeTaskSchema>;

// ── Query keys ─────────────────────────────────────────────────────

const taskKeys = {
  list: (query: ListTasksQuery) => ["tasks", "list", query] as const,
  counts: () => ["tasks", "counts"] as const,
  detail: (id: string) => ["tasks", id] as const,
};

// ── Queries ────────────────────────────────────────────────────────

export function useTasks(query: ListTasksQuery = {}) {
  const params: Record<string, string> = {};
  if (query.status) params.status = query.status;
  if (query.customerId) params.customerId = query.customerId;
  if (query.dueOn) params.dueOn = query.dueOn;
  if (query.dueFrom) params.dueFrom = query.dueFrom;
  if (query.dueTo) params.dueTo = query.dueTo;
  if (query.triggerType) params.triggerType = query.triggerType;
  if (query.limit !== undefined) params.limit = String(query.limit);

  return useQuery({
    queryKey: taskKeys.list(query),
    queryFn: () => api.get<Task[]>("/tasks", params),
  });
}

export function useTaskCounts() {
  return useQuery({
    queryKey: taskKeys.counts(),
    queryFn: () => api.get<TaskCounts>("/tasks/counts"),
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => api.get<Task>(`/tasks/${id}`),
    enabled: !!id,
  });
}

// ── Mutations ──────────────────────────────────────────────────────

function invalidateTaskLists(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["tasks", "list"] });
  qc.invalidateQueries({ queryKey: taskKeys.counts() });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Task>(`/tasks/${id}/complete`, {}),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: taskKeys.detail(updated.id) });
      invalidateTaskLists(qc);
    },
  });
}

export function useDismissTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Task>(`/tasks/${id}/dismiss`, {}),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: taskKeys.detail(updated.id) });
      invalidateTaskLists(qc);
    },
  });
}

export function useSnoozeTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & SnoozeTaskInput) =>
      api.post<Task>(`/tasks/${id}/snooze`, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: taskKeys.detail(updated.id) });
      invalidateTaskLists(qc);
    },
  });
}

export function useReopenTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Task>(`/tasks/${id}/reopen`, {}),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: taskKeys.detail(updated.id) });
      invalidateTaskLists(qc);
    },
  });
}
