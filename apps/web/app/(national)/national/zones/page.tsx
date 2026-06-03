import type { Metadata } from "next";
import { NationalZonesReport } from "./_components/national-zones-report";

export const metadata: Metadata = {
  title: "Zonas — L'Oréal Clienteling",
};

export default function Page() {
  return <NationalZonesReport />;
}
