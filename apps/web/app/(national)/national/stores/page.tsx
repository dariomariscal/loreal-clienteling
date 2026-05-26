import type { Metadata } from "next";
import { NationalStoresPage } from "./_components/national-stores-page";

export const metadata: Metadata = {
  title: "Tiendas — L'Oréal Clienteling",
};

export default function Page() {
  return <NationalStoresPage />;
}
