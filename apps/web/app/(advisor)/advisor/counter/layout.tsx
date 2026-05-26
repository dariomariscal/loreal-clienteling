import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { isCounterRole } from "./_lib/role-guard";

/**
 * Counter section guard. Roles outside COUNTER_ROLES are bounced back to the
 * BA home. The outer (advisor) layout already validates Clerk session and
 * `user.active`, so we only check role here.
 */
export default async function CounterLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);
  if (!isCounterRole(session.user.role)) redirect("/advisor/today");

  return <>{children}</>;
}
