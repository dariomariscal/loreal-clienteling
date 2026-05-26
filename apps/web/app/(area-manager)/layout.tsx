import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { isAreaManagerRole } from "./_lib/role-guard";
import { AreaManagerShell } from "./_components/area-manager-shell";

export default async function AreaManagerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);
  if (!session.user.active) redirect(ROUTES.SIGN_IN);
  if (!isAreaManagerRole(session.user.role)) redirect("/advisor/today");

  return <AreaManagerShell user={session.user}>{children}</AreaManagerShell>;
}
