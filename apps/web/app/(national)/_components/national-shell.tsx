"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { NationalSidebar } from "./national-sidebar";
import type { SessionUser } from "@/lib/auth";

interface Props {
  user: SessionUser;
  children: ReactNode;
}

/**
 * Shell of the (national) section. Mirrors the Area Manager: Tier-3 screens
 * (heatmap, inventory matrix) collapse the sidebar to a 72pt rail even on
 * landscape because the dense canvas needs every horizontal pixel.
 */
export function NationalShell({ user, children }: Props) {
  const pathname = usePathname();
  const forceRail =
    pathname.startsWith("/national/heatmap") ||
    pathname.startsWith("/national/inventory");

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[color:var(--ba-surface)] text-foreground">
      <NationalSidebar user={user} forceRail={forceRail} />
      <main className="advisor-scope flex flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
