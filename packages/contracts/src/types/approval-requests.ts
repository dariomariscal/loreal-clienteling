export type ApprovalType =
  | "reservation_long"
  | "discount_special"
  | "return"
  | "vip_profile_change";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  status: ApprovalStatus;
  storeId: string;
  brandId: string | null;
  customerId: string | null;
  requestedByUserId: string;
  decidedByUserId: string | null;
  reason: string | null;
  decisionNotes: string | null;
  payload: Record<string, unknown>;
  decidedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApprovalRequest {
  type: ApprovalType;
  customerId?: string;
  reason?: string;
  payload: Record<string, unknown>;
  expiresAt?: string;
}

export interface DecideApprovalRequest {
  decision: "approve" | "reject";
  notes?: string;
}

export interface ApprovalRequestFilters {
  status?: ApprovalStatus;
  type?: ApprovalType;
  requestedByUserId?: string;
  customerId?: string;
}
