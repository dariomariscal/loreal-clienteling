import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface ServiceType {
  id: string;
  code: string;
  displayName: string;
  durationMinutes: number | null;
  color: string | null;
  description: string | null;
  brandId: string | null;
  maxCapacity: number | null;
  requiresConfirmation: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const serviceTypeKeys = {
  all: ["service-types"] as const,
};

export function useServiceTypes() {
  return useQuery({
    queryKey: serviceTypeKeys.all,
    queryFn: () => api.get<ServiceType[]>("/service-types"),
  });
}
