import { api } from "@/lib/api/client";

export interface MeResponse {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: "ba" | "manager" | "supervisor" | "admin";
  storeId: string | null;
  storeName: string | null;
  zoneId: string | null;
  zoneName: string | null;
  brandId: string | null;
  brandName: string | null;
  isActive: boolean;
  invitationStatus: string | null;
  invitedAt: string | null;
  lastSignInAt: string | null;
  createdAt: string;
}

export const usersApi = {
  me: () => api.get<MeResponse>("/users/me").then((r) => r.data),
};
