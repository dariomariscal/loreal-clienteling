import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { ZonesPage } from "./_components/zones-page";

export default async function ZonasPage() {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);

  return <ZonesPage user={session.user} />;
}
