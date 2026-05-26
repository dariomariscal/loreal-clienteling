import type { Metadata } from "next";
import { NationalTodayPage } from "./_components/national-today-page";

export const metadata: Metadata = {
  title: "Vista nacional — L'Oréal Clienteling",
};

export default function Page() {
  return <NationalTodayPage />;
}
