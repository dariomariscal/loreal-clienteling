import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ConfigPage } from "./_components/config-page";

export default async function Page() {
  const session = await getSession();
  if (session?.user?.role !== "admin") redirect("/");
  return <ConfigPage />;
}
