import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  RegisterCustomer,
  DuplicateCheckResponse,
} from "@loreal/contracts";
import type { Customer } from "./use-customers";

const registrationKeys = {
  duplicateCheck: (email: string, phone: string) =>
    ["customers", "check-duplicate", email, phone] as const,
};

/**
 * Live duplicate detection used by the wizard's "search before create" step.
 * Disabled until the input has a plausible email or 10-digit phone — saves
 * round-trips on every keystroke.
 */
export function useDuplicateCheck(params: {
  email?: string;
  phone?: string;
}) {
  const email = params.email ?? "";
  const phone = params.phone ?? "";
  const isQueryable =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /^\d{10}$/.test(phone);

  return useQuery({
    queryKey: registrationKeys.duplicateCheck(email, phone),
    queryFn: () => {
      const query: Record<string, string> = {};
      if (email) query.email = email;
      if (phone) query.phone = phone;
      return api.get<DuplicateCheckResponse>(
        "/customers/check-duplicate",
        query,
      );
    },
    enabled: isQueryable,
    staleTime: 30 * 1000,
  });
}

export function useRegisterCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RegisterCustomer) =>
      api.post<Customer>("/customers/register", data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
}
