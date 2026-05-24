import { redirect } from "next/navigation";

// Root of the BA app: always lands on "Hoy".
export default function BaIndexPage() {
  redirect("/ba/today");
}
