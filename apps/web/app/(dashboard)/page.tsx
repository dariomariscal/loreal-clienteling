import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { DashboardPage } from "./_components/dashboard-page";

export default async function Page() {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);
  return <DashboardPage user={session.user} />;
}
