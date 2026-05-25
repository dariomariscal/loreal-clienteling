"use client";

import { AdvisorNav } from "@/app/(advisor)/_components/advisor-nav";
import type { SessionUser } from "@/lib/auth";

interface Props {
  user: SessionUser;
}

/**
 * On tablet portrait (md, 768–1023px) the sidebar collapses to a 72px
 * icon-only rail (Material 3 Medium window class). On lg+ it expands to the
 * full 240px sidebar with labels.
 */
export function AdvisorSidebar({ user }: Props) {
  return (
    <nav
      aria-label="Beauty Advisor navigation"
      className="hidden md:flex h-dvh w-[72px] lg:w-[240px] flex-col border-r border-[color:var(--ba-sidebar-border)]"
    >
      <div className="flex h-full w-full flex-col lg:hidden">
        <AdvisorNav user={user} collapsed />
      </div>
      <div className="hidden h-full w-full flex-col lg:flex">
        <AdvisorNav user={user} />
      </div>
    </nav>
  );
}
