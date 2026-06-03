import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { BrandsPage } from "./_components/brands-page";

export default async function MarcasPage() {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);

  return <BrandsPage user={session.user} />;
}
