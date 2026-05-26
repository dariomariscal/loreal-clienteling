import type { Metadata } from "next";
import { AreaCustomersPage } from "@/app/(area-manager)/area-manager/customers/_components/area-customers-page";

export const metadata: Metadata = {
  title: "Clientas — L'Oréal Clienteling",
};

/**
 * Customer triage at NRM scope. The `useCustomers` hook is already scoped
 * by the API to the caller's accessible stores; for an NRM that's every
 * store in their division. The triage buckets (birthday/at-risk/VIP/all)
 * apply identically — pure DRY.
 */
export default function Page() {
  return <AreaCustomersPage />;
}
