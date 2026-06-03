import type { Metadata } from "next";
import { NationalFranchisesReport } from "./_components/national-franchises-report";

export const metadata: Metadata = {
  title: "Top Franquicias y Marcas — L'Oréal Clienteling",
};

export default function Page() {
  return <NationalFranchisesReport />;
}
