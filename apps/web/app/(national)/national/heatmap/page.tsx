import type { Metadata } from "next";
import { NationalHeatmapPage } from "./_components/national-heatmap-page";

export const metadata: Metadata = {
  title: "Mapa nacional — L'Oréal Clienteling",
};

export default function Page() {
  return <NationalHeatmapPage />;
}
