import { ThreeColumnLayout } from "@/components/advisor/three-column-layout";
import { CustomerList } from "@/components/advisor/customer-list";
import { CustomerDetail } from "./_components/customer-detail";

export const metadata = { title: "Client" };

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ThreeColumnLayout
      list={<CustomerList activeCustomerId={id} />}
      detail={<CustomerDetail customerId={id} />}
    />
  );
}
