import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { PreferencesPage } from "./_components/preferences-page";

export default async function Page() {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);
  return <PreferencesPage user={session.user} />;
}
