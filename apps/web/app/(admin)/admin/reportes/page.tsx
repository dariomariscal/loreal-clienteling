import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { AnalyticsPage } from "./_components/analytics-page";

export default async function ReportesPage() {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);

  return <AnalyticsPage user={session.user} />;
}
