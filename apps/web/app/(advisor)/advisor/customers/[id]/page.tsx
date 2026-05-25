import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { ThreeColumnLayout } from "@/components/advisor/three-column-layout";
import { CustomerList } from "@/components/advisor/customer-list";
import { CustomerDetail } from "./_components/customer-detail";

export const metadata = { title: "Client" };

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);

  const { id } = await params;
  return (
    <ThreeColumnLayout
      list={<CustomerList activeCustomerId={id} />}
      detail={
        <CustomerDetail
          customerId={id}
          role={session.user.role}
          staffUserId={session.user.id}
        />
      }
    />
  );
}
