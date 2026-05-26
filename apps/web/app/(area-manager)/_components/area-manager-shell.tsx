"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AreaManagerSidebar } from "./area-manager-sidebar";
import type { SessionUser } from "@/lib/auth";

interface Props {
  user: SessionUser;
  children: ReactNode;
}

/**
 * Shell of the (area-manager) section. On Tier-3 screens (heatmap, inventory
 * matrix) the sidebar collapses to a 72pt rail even on landscape — the
 * dense canvas needs every horizontal pixel, and the user is in
 * "exploration mode" so the rail-only nav with tooltips keeps every
 * destination one tap away without dominating the view.
 */
export function AreaManagerShell({ user, children }: Props) {
  const pathname = usePathname();
  const forceRail =
    pathname.startsWith("/area-manager/heatmap") ||
    pathname.startsWith("/area-manager/inventory");

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[color:var(--ba-surface)] text-foreground">
      <AreaManagerSidebar user={user} forceRail={forceRail} />
      <main className="advisor-scope flex flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
