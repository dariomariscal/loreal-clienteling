import { z } from "zod";

export const APPROVAL_TYPES = [
  "reservation_long",
  "discount_special",
  "return",
  "vip_profile_change",
] as const;

export const APPROVAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
] as const;

export const createApprovalRequestSchema = z.object({
  type: z.enum(APPROVAL_TYPES),
  customerId: z.string().uuid().optional(),
  reason: z.string().max(1000).optional(),
  payload: z.record(z.string(), z.unknown()),
  expiresAt: z.string().optional(),
});

export const decideApprovalRequestSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  notes: z.string().max(1000).optional(),
});

export const approvalRequestFiltersSchema = z.object({
  status: z.enum(APPROVAL_STATUSES).optional(),
  type: z.enum(APPROVAL_TYPES).optional(),
  requestedByUserId: z.string().optional(),
  customerId: z.string().uuid().optional(),
});
