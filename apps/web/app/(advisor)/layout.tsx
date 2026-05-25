import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { AdvisorSidebar } from "@/components/advisor/advisor-sidebar";

export default async function AdvisorLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session?.user) redirect(ROUTES.SIGN_IN);
  if (!session.user.active) redirect(ROUTES.SIGN_IN);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[color:var(--ba-surface)] text-foreground">
      <AdvisorSidebar user={session.user} />
      <main className="flex flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
