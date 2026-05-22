import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { ProfilePage } from "./_components/profile-page";

export const metadata = { title: "Mi perfil" };

export default async function Page() {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);

  return <ProfilePage user={session.user} />;
}
