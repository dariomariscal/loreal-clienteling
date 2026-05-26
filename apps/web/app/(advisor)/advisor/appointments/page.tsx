import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { AppointmentsPage } from "./_components/appointments-page";

export const metadata = { title: "Citas" };

export default async function Page() {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);
  return <AppointmentsPage user={session.user} />;
}
