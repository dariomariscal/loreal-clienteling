import type { Metadata } from "next";
import { NationalSegmentsPage } from "./_components/national-segments-page";

export const metadata: Metadata = {
  title: "Segmentos — L'Oréal Clienteling",
};

export default function Page() {
  return <NationalSegmentsPage />;
}
