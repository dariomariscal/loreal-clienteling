import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { CustomerProfileScreen } from "./_components/customer-profile-screen";

interface CustomerProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerProfilePage({
  params,
}: CustomerProfilePageProps) {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);

  const { id } = await params;
  return <CustomerProfileScreen customerId={id} user={session.user} />;
}
