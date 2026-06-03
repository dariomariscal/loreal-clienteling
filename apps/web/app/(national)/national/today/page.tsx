import type { Metadata } from "next";
import { NationalDashboardReport } from "./_components/national-dashboard-report";

export const metadata: Metadata = {
  title: "Vista nacional — L'Oréal Clienteling",
};

export default function Page() {
  return <NationalDashboardReport />;
}
