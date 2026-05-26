import type { Metadata } from "next";
import { NationalTeamPage } from "./_components/national-team-page";

export const metadata: Metadata = {
  title: "Equipo — L'Oréal Clienteling",
};

export default function Page() {
  return <NationalTeamPage />;
}
