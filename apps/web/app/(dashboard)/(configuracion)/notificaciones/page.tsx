import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { NotificationsPage } from "./_components/notifications-page";

export const metadata = { title: "Notificaciones" };

export default async function Page() {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);

  return <NotificationsPage />;
}
