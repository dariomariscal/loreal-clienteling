import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { AdvisorShell } from "./_components/advisor-shell";

export default async function AdvisorLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);
  if (!session.user.active) redirect(ROUTES.SIGN_IN);

  return <AdvisorShell user={session.user}>{children}</AdvisorShell>;
}
