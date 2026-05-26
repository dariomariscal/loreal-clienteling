import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

// ── Types ──────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
}

// ── Query keys ─────────────────────────────────────────────────────

export interface AuditLogFilters {
  page?: string;
  limit?: string;
  action?: string;
  entityType?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
}

const auditKeys = {
  list: (filters: AuditLogFilters) => ["audit-logs", filters] as const,
  detail: (id: string) => ["audit-logs", id] as const,
  summary: (params: AuditSummaryParams) =>
    ["audit-logs", "summary", params] as const,
};

// ── Queries (read-only — audit logs are never mutated from frontend) ─

export function useAuditLogs(filters: AuditLogFilters = {}) {
  const params: Record<string, string> = {};
  if (filters.page) params.page = filters.page;
  if (filters.limit) params.limit = filters.limit;
  if (filters.action) params.action = filters.action;
  if (filters.entityType) params.entityType = filters.entityType;
  if (filters.actorUserId) params.actorUserId = filters.actorUserId;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;

  return useQuery({
    queryKey: auditKeys.list(filters),
    queryFn: () => api.get<AuditLog[]>("/audit-logs", params),
  });
}

export function useAuditLog(id: string) {
  return useQuery({
    queryKey: auditKeys.detail(id),
    queryFn: () => api.get<AuditLog>(`/audit-logs/${id}`),
    enabled: !!id,
  });
}

// ── Summary (visible to area_manager and national_retail_manager) ──

export interface AuditSummaryParams {
  /** ISO-8601. Defaults to 30 days ago on the server. */
  from?: string;
  to?: string;
  /** Top-N for byAction, byEntityType and topActors. Defaults to 20. */
  limit?: number;
}

export interface AuditSummary {
  period: { from: string; to: string };
  totals: { events: number };
  byAction: { action: string; count: number }[];
  byEntityType: { entityType: string; count: number }[];
  topActors: {
    actorUserId: string | null;
    actorFullName: string | null;
    count: number;
  }[];
}

/**
 * Aggregated audit view: counts by action, entityType, top actors. The full
 * audit log row stream stays admin-only — managers see this rolled-up shape.
 */
export function useAuditLogsSummary(params: AuditSummaryParams = {}) {
  return useQuery({
    queryKey: auditKeys.summary(params),
    queryFn: () => {
      const query: Record<string, string> = {};
      if (params.from) query.from = params.from;
      if (params.to) query.to = params.to;
      if (params.limit) query.limit = String(params.limit);
      return api.get<AuditSummary>(
        "/audit-logs/summary",
        Object.keys(query).length ? query : undefined,
      );
    },
  });
}
