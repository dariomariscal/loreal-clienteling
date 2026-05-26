import type { Metadata } from "next";
import { AreaApprovalsPage } from "@/app/(area-manager)/area-manager/approvals/_components/area-approvals-page";

export const metadata: Metadata = {
  title: "Aprobaciones — L'Oréal Clienteling",
};

/**
 * Approvals queue at NRM scope. The endpoint already filters by the
 * caller's accessible stores; the list+detail UX is identical to the AM —
 * Linear/Gmail/GitHub-style — so we reuse the component as-is.
 */
export default function Page() {
  return <AreaApprovalsPage />;
}
