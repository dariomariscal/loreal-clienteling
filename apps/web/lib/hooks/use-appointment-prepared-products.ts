import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  AddPreparedProductInput,
  UpdatePreparedProductStatusInput,
} from "@/lib/schemas/appointment-prepared-products";

export interface PreparedProductWithCatalog {
  id: string;
  appointmentId: string;
  productId: string;
  variantId: string | null;
  position: number;
  status: string;
  note: string | null;
  addedByUserId: string;
  addedAt: string;
  statusChangedAt: string | null;
  product: {
    id: string;
    sku: string;
    title: string;
    images: unknown;
    price: string;
  } | null;
}

const keys = {
  byAppointment: (appointmentId: string) =>
    ["appointments", appointmentId, "prepared-products"] as const,
};

export function useAppointmentPreparedProducts(appointmentId: string) {
  return useQuery({
    queryKey: keys.byAppointment(appointmentId),
    queryFn: () =>
      api.get<PreparedProductWithCatalog[]>(
        `/appointments/${appointmentId}/prepared-products`,
      ),
    enabled: !!appointmentId,
  });
}

export function useAddPreparedProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      appointmentId,
      ...data
    }: { appointmentId: string } & AddPreparedProductInput) =>
      api.post<PreparedProductWithCatalog>(
        `/appointments/${appointmentId}/prepared-products`,
        data,
      ),
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({
        queryKey: keys.byAppointment(vars.appointmentId),
      });
    },
  });
}

export function useUpdatePreparedProductStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      appointmentId,
      id,
      ...data
    }: {
      appointmentId: string;
      id: string;
    } & UpdatePreparedProductStatusInput) =>
      api.patch<PreparedProductWithCatalog>(
        `/appointments/${appointmentId}/prepared-products/${id}`,
        data,
      ),
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({
        queryKey: keys.byAppointment(vars.appointmentId),
      });
    },
  });
}

export function useRemovePreparedProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      appointmentId,
      id,
    }: {
      appointmentId: string;
      id: string;
    }) =>
      api.delete<{ id: string }>(
        `/appointments/${appointmentId}/prepared-products/${id}`,
      ),
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({
        queryKey: keys.byAppointment(vars.appointmentId),
      });
    },
  });
}
