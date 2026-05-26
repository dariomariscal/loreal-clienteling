import type { Metadata } from "next";
import { NationalBrandsPage } from "./_components/national-brands-page";

export const metadata: Metadata = {
  title: "Marcas — L'Oréal Clienteling",
};

export default function Page() {
  return <NationalBrandsPage />;
}
