import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { AuditPage } from "./_components/audit-page";

export default async function AuditoriaPage() {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);

  return <AuditPage />;
}
