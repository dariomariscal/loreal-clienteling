"use client";

import { AreaManagerNav } from "./area-manager-nav";
import type { SessionUser } from "@/lib/auth";

interface Props {
  user: SessionUser;
  /**
   * Pin the sidebar to its 72pt collapsed rail regardless of viewport size.
   * Used by Tier-3 screens (heatmap, inventory matrix) that need every
   * horizontal pixel for their dense canvas.
   */
  forceRail?: boolean;
}

/**
 * Tablet portrait (md, 768–1023px) → 72pt icon-only rail.
 * Landscape (lg+) → full 240pt sidebar with labels.
 * `forceRail` pins the rail mode for full-bleed pages.
 */
export function AreaManagerSidebar({ user, forceRail = false }: Props) {
  if (forceRail) {
    return (
      <nav
        aria-label="Area Manager navigation"
        className="hidden md:flex h-dvh w-[72px] flex-col border-r border-[color:var(--ba-sidebar-border)]"
      >
        <AreaManagerNav user={user} collapsed />
      </nav>
    );
  }

  return (
    <nav
      aria-label="Area Manager navigation"
      className="hidden md:flex h-dvh w-[72px] lg:w-[240px] flex-col border-r border-[color:var(--ba-sidebar-border)]"
    >
      <div className="flex h-full w-full flex-col lg:hidden">
        <AreaManagerNav user={user} collapsed />
      </div>
      <div className="hidden h-full w-full flex-col lg:flex">
        <AreaManagerNav user={user} />
      </div>
    </nav>
  );
}
