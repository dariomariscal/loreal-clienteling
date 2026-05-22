import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { AgendaPage } from "./_components/agenda-page";

export default async function AgendaRoute() {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);
  if (session.user.role !== "ba") redirect(ROUTES.DASHBOARD);

  return <AgendaPage user={session.user} />;
}
