import type { Metadata } from "next";
import { NationalTemplatesPage } from "./_components/national-templates-page";

export const metadata: Metadata = {
  title: "Plantillas — L'Oréal Clienteling",
};

export default function Page() {
  return <NationalTemplatesPage />;
}
