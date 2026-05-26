import type { Metadata } from "next";
import { NationalAuditPage } from "./_components/national-audit-page";

export const metadata: Metadata = {
  title: "Auditoría — L'Oréal Clienteling",
};

export default function Page() {
  return <NationalAuditPage />;
}
