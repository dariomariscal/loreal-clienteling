import type {
  CreateCustomer,
  DuplicateCheckResponse,
  RegisterCustomer,
  UpdateCustomer,
} from "@loreal/contracts";

import { api } from "@/lib/api/client";

export interface CustomerListFilters {
  page?: number;
  limit?: number;
  stage?: string;
  storeId?: string;
  brandId?: string;
  assignedToUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  birthdayWithinDays?: number;
  sortBy?: "name" | "enrolledAt" | "lastInteractionAt" | "lastOrderAt" | "ltv";
  sortOrder?: "asc" | "desc";
}

export interface CustomerActivityCursor {
  limit?: number;
  before?: string;
}

export const customersApi = {
  list: (filters: CustomerListFilters = {}) =>
    api.get("/customers", { params: filters }).then((r) => r.data),

  get: (id: string) => api.get(`/customers/${id}`).then((r) => r.data),

  search: (query: string, type: "exact" | "name" | "semantic" = "name") =>
    api
      .get("/customers/search", { params: { query, type } })
      .then((r) => r.data),

  checkDuplicate: (params: { email?: string; phone?: string }) =>
    api
      .get<DuplicateCheckResponse>("/customers/check-duplicate", { params })
      .then((r) => r.data),

  getMetrics: (id: string) =>
    api.get(`/customers/${id}/metrics`).then((r) => r.data),

  getActivity: (id: string, cursor: CustomerActivityCursor = {}) =>
    api
      .get(`/customers/${id}/activity`, { params: cursor })
      .then((r) => r.data),

  create: (payload: CreateCustomer) =>
    api.post("/customers", payload).then((r) => r.data),

  register: (payload: RegisterCustomer) =>
    api.post("/customers/register", payload).then((r) => r.data),

  update: (id: string, payload: UpdateCustomer) =>
    api.patch(`/customers/${id}`, payload).then((r) => r.data),
};
