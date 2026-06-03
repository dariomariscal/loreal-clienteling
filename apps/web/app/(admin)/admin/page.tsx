import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { AdminPage } from "../_components/admin-page";

export default async function Page() {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);
  return <AdminPage user={session.user} />;
}
