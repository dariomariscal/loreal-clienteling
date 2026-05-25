"use client";

import { AdvisorNav } from "@/app/(advisor)/_components/advisor-nav";
import type { SessionUser } from "@/lib/auth";

interface Props {
  user: SessionUser;
}

export function AdvisorSidebar({ user }: Props) {
  return (
    <nav
      aria-label="Beauty Advisor navigation"
      className="hidden md:flex h-dvh w-[240px] flex-col border-r border-[color:var(--ba-sidebar-border)]"
    >
      <AdvisorNav user={user} />
    </nav>
  );
}
