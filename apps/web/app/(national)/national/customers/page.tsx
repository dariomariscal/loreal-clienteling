import type { Metadata } from "next";
import { NationalCustomersReport } from "./_components/national-customers-report";

export const metadata: Metadata = {
  title: "Clientes — L'Oréal Clienteling",
};

export default function Page() {
  return <NationalCustomersReport />;
}
