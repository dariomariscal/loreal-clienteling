import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { CustomerProfileShell } from "./_components/customer-profile-shell";

export const metadata = { title: "Client" };

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);

  const { id } = await params;
  return <CustomerProfileShell customerId={id} user={session.user} />;
}
