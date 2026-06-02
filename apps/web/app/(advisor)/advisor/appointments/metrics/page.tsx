import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { AppointmentMetricsPage } from "./_components/appointment-metrics-page";

export const metadata = { title: "Métricas de citas" };

export default async function Page() {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);
  return <AppointmentMetricsPage user={session.user} />;
}
