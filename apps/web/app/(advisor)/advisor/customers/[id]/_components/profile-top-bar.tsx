"use client";

import Link from "next/link";
import { useBrand } from "@/lib/hooks/use-brands";
import { AdvisorBrandLogo } from "@/components/advisor/advisor-brand-logo";
import { MenuGlyph } from "@/components/ui/glyphs";
import type { SessionUser } from "@/lib/auth";

interface Props {
  user: SessionUser;
  onOpenMenu: () => void;
  menuOpen: boolean;
}

/**
 * Top bar of the customer 360. Spans the full width above both columns.
 * Left: hamburger + "Clientes" breadcrumb back to the list. Center: brand
 * mark. Right: reserved for future shortcuts (notifications, create, etc.).
 */
export function ProfileTopBar({ user, onOpenMenu, menuOpen }: Props) {
  const { data: brand } = useBrand(user.brandId ?? "");

  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-[color:var(--ba-sidebar-border)] bg-[color:var(--ba-sidebar)] px-4 text-[color:var(--ba-sidebar-foreground)]">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-expanded={menuOpen}
          aria-controls="advisor-menu"
          aria-label="Abrir menú"
          className="inline-flex size-10 items-center justify-center rounded-md transition-colors hover:bg-[color:var(--ba-sidebar-active)]"
        >
          <MenuGlyph className="size-5" aria-hidden />
        </button>
        <Link
          href="/advisor/customers"
          className="text-sm font-medium text-[color:var(--ba-sidebar-foreground)] transition-colors hover:opacity-80"
        >
          Clientes
        </Link>
      </div>

      <div className="pointer-events-none flex items-center">
        <AdvisorBrandLogo
          role={user.role}
          brandCode={brand?.code}
          width={brand?.code?.toUpperCase() === "LANCOME" ? 120 : 90}
          className="text-[color:var(--ba-sidebar-foreground)]"
        />
      </div>

      <div className="w-10" aria-hidden />
    </div>
  );
}
