export interface AuditLog {
  id: string;
  /** Null when the action was performed by the system (webhook, cron). */
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  /** ISO-8601 timestamp. */
  timestamp: string;
}
