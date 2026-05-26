import type { Metadata } from "next";
import { ZonesRankingPage } from "./_components/zones-ranking-page";

export const metadata: Metadata = {
  title: "Zonas — L'Oréal Clienteling",
};

export default function Page() {
  return <ZonesRankingPage />;
}
