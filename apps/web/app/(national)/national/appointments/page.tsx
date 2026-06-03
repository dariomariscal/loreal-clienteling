import type { Metadata } from "next";
import { NationalAppointmentsReport } from "./_components/national-appointments-report";

export const metadata: Metadata = {
  title: "Métricas de citas — L'Oréal Clienteling",
};

export default function Page() {
  return <NationalAppointmentsReport />;
}
