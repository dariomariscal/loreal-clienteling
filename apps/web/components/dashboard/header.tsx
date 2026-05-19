"use client";

import { useSidebar } from "@/components/dashboard/sidebar-context";
import { GlobalSearch } from "@/components/dashboard/global-search";

export function DashboardHeader() {
  const { setMobileOpen } = useSidebar();

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border/50 bg-background px-4 md:px-6">
      <button
        onClick={() => setMobileOpen(true)}
        className="mr-3 flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground md:hidden"
        aria-label="Abrir menú"
      >
        <HamburgerIcon className="size-5" />
      </button>

      <GlobalSearch />
    </header>
  );
}

function HamburgerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M2 4h12M2 8h12M2 12h12" />
    </svg>
  );
}
