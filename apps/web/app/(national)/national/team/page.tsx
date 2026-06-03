import type { Metadata } from "next";
import { NationalPerformanceReport } from "./_components/national-performance-report";

export const metadata: Metadata = {
  title: "Desempeño por BA — L'Oréal Clienteling",
};

export default function Page() {
  return <NationalPerformanceReport />;
}
