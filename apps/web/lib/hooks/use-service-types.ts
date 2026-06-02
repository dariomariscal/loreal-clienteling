import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  CreateServiceTypeInput,
  UpdateServiceTypeInput,
} from "@/lib/schemas/service-types";

export interface ServiceType {
  id: string;
  code: string;
  displayName: string;
  durationMinutes: number | null;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  price: string | null;
  color: string | null;
  description: string | null;
  brandId: string | null;
  maxCapacity: number | null;
  requiresConfirmation: boolean;
  minLeadTimeMinutes: number;
  maxAdvanceDays: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const serviceTypeKeys = {
  all: ["service-types"] as const,
  eligible: ["service-types", "eligible-for-me"] as const,
  detail: (id: string) => ["service-types", id] as const,
};

export function useServiceTypes() {
  return useQuery({
    queryKey: serviceTypeKeys.all,
    queryFn: () => api.get<ServiceType[]>("/service-types"),
  });
}

/**
 * Services the current BA is qualified to deliver — brand-scoped AND
 * skill-filtered server-side. Use this in the booking sheet so unqualified
 * services never appear.
 */
export function useEligibleServiceTypes() {
  return useQuery({
    queryKey: serviceTypeKeys.eligible,
    queryFn: () => api.get<ServiceType[]>("/service-types/eligible-for-me"),
  });
}

export function useServiceType(id: string) {
  return useQuery({
    queryKey: serviceTypeKeys.detail(id),
    queryFn: () => api.get<ServiceType>(`/service-types/${id}`),
    enabled: !!id,
  });
}

export function useCreateServiceType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateServiceTypeInput) =>
      api.post<ServiceType>("/service-types", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: serviceTypeKeys.all }),
  });
}

export function useUpdateServiceType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateServiceTypeInput) =>
      api.patch<ServiceType>(`/service-types/${id}`, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: serviceTypeKeys.detail(updated.id) });
      qc.invalidateQueries({ queryKey: serviceTypeKeys.all });
    },
  });
}
