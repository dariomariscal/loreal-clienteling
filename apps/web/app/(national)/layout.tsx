import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { homeForRole } from "@/lib/auth/home-for-role";
import { isNationalRole } from "./_lib/role-guard";
import { NationalShell } from "./_components/national-shell";

export default async function NationalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);
  if (!session.user.active) redirect(ROUTES.SIGN_IN);
  if (!isNationalRole(session.user.role)) {
    redirect(homeForRole(session.user.role));
  }

  return <NationalShell user={session.user}>{children}</NationalShell>;
}
