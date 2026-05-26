import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { ActivityPage } from "./_components/activity-page";

export default async function Page() {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);
  return <ActivityPage user={session.user} />;
}
