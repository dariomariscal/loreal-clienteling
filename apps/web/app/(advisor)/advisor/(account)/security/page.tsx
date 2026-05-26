import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { SecurityPage } from "./_components/security-page";

export default async function Page() {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);
  return <SecurityPage user={session.user} />;
}
