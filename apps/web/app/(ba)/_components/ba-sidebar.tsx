"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import {
  AppointmentGlyph,
  MessageGlyph,
  SearchGlyph,
  UserPlusGlyph,
} from "@/components/ui/glyphs";
import { useCommandSearch } from "./command-search-provider";
import { NewCustomerSheet } from "./new-customer-sheet";
import type { SessionUser } from "@/lib/auth";

// Primary navigation entries — kept to the three things María actually
// does. Anything else lives behind cmd-K (search) or the customer profile.
const NAV_ITEMS = [
  { href: "/ba/today", label: "Hoy", glyph: HomeGlyphInline },
  { href: "/ba/messages", label: "Mensajes", glyph: MessageGlyph },
  { href: "/ba/schedule", label: "Citas", glyph: AppointmentGlyph },
] as const;

interface BaSidebarProps {
  user: SessionUser;
}

export function BaSidebar({ user }: BaSidebarProps) {
  const pathname = usePathname();
  const commandSearch = useCommandSearch();
  const [isNewCustomerOpen, setIsNewCustomerOpen] = React.useState(false);

  return (
    <aside
      className="hidden h-full w-[280px] shrink-0 flex-col border-r border-[var(--ba-sidebar-border)] bg-[var(--ba-sidebar)] text-[var(--ba-sidebar-foreground)] md:flex"
      aria-label="Navegación"
    >
      {/* Brand + identity — compact, single line */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <Avatar name={user.fullName} src={user.imageUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">{user.fullName}</p>
          <p className="text-[11px] text-[var(--ba-sidebar-muted)]">Consultora</p>
        </div>
      </div>

      {/* Cmd-K trigger — pretends to be an input but opens the palette */}
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={commandSearch.open}
          className={cn(
            "group flex w-full items-center gap-2 rounded-lg border border-[var(--ba-sidebar-border)] bg-white/60 px-2.5 py-1.5",
            "text-[13px] text-[var(--ba-sidebar-muted)] transition-colors",
            "hover:border-foreground/20 hover:text-foreground/80",
          )}
          aria-label="Buscar clienta (Cmd K)"
        >
          <SearchGlyph className="size-3.5" />
          <span className="flex-1 text-left">Buscar clienta</span>
          <kbd className="rounded border border-[var(--ba-sidebar-border)] bg-white px-1 py-px font-mono text-[10px] leading-none">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Primary nav — list, not cards */}
      <nav className="px-2">
        <ul className="space-y-px">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Glyph = item.glyph;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                    isActive
                      ? "bg-[var(--ba-sidebar-active)] text-foreground"
                      : "text-[var(--ba-sidebar-foreground)] hover:bg-[var(--ba-sidebar-active)]/60",
                  )}
                >
                  <Glyph className="size-4 text-[var(--ba-sidebar-muted)]" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Divider />

      {/* Recent customers — placeholder section; populated once a customer is opened */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <p className="px-2 pt-1 pb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--ba-sidebar-muted)]">
          Recientes
        </p>
        <RecentCustomersList />
      </div>

      {/* New customer — sticks to the bottom, accent-only, restraint */}
      <div className="border-t border-[var(--ba-sidebar-border)] p-2">
        <button
          type="button"
          onClick={() => setIsNewCustomerOpen(true)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium",
            "text-[var(--ba-sidebar-foreground)] transition-colors",
            "hover:bg-[var(--ba-sidebar-active)]",
          )}
        >
          <UserPlusGlyph className="size-4 text-[var(--ba-sidebar-muted)]" />
          <span>Nueva clienta</span>
        </button>
      </div>

      <NewCustomerSheet open={isNewCustomerOpen} onOpenChange={setIsNewCustomerOpen} />
    </aside>
  );
}

function Divider() {
  return <div className="my-2 mx-3 border-t border-[var(--ba-sidebar-border)]" />;
}

// ── Recent customers ────────────────────────────────────────────────

function RecentCustomersList() {
  // The recents list is hydrated client-side from localStorage as the BA
  // opens customer profiles. Keeping this empty-first avoids a network
  // round-trip on every page load and matches the "library, not directory"
  // metaphor: María sees who she's actually been working with.
  const [recents] = React.useState<Array<{ id: string; name: string }>>([]);

  if (recents.length === 0) {
    return (
      <p className="px-2 py-2 text-[12px] leading-relaxed text-[var(--ba-sidebar-muted)]">
        Aquí aparecerán las clientas que vayas abriendo.
      </p>
    );
  }

  return (
    <ul className="space-y-px">
      {recents.map((c) => (
        <li key={c.id}>
          <Link
            href={`/ba/customers/${c.id}`}
            className="flex items-center gap-2 truncate rounded-md px-2 py-1.5 text-[13px] hover:bg-[var(--ba-sidebar-active)]"
          >
            <Avatar name={c.name} size="xs" />
            <span className="truncate">{c.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ── Inline glyph — "Hoy" home icon (deliberately uses the existing
// monoline style; doesn't earn its own export in glyphs.tsx for one use). ─

function HomeGlyphInline(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8.5Z" />
    </svg>
  );
}
