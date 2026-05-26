"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AdvisorSidebar } from "@/components/advisor/advisor-sidebar";
import type { SessionUser } from "@/lib/auth";

interface Props {
  user: SessionUser;
  children: ReactNode;
}

/**
 * Decides whether the global brand sidebar is visible. On the customer 360
 * route (`/advisor/customers/[id]`) the sidebar collapses entirely so the
 * profile owns the full viewport — its own shell provides a hamburger that
 * opens the same nav (plus the customer list) in a drawer.
 */
export function AdvisorShell({ user, children }: Props) {
  const pathname = usePathname();
  const isCustomerProfile =
    pathname.startsWith("/advisor/customers/") &&
    pathname !== "/advisor/customers";

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[color:var(--ba-surface)] text-foreground">
      {isCustomerProfile ? null : <AdvisorSidebar user={user} />}
      <main className="advisor-scope flex flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
