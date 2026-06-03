"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";
import { useClerk } from "@clerk/nextjs";
import { useSidebar } from "@/components/admin/sidebar-context";
import { LorealLogo } from "@/components/ui/brand-logos";
import { Avatar } from "@/components/ui/avatar";
import { CreateMenuButton } from "@/components/admin/create-menu-button";
import { ProfileSwitcherTrigger } from "@/components/auth/profile-switcher-trigger";

// ── Types ────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  label?: string;
  items: readonly NavItem[];
}

interface SidebarProps {
  user: {
    fullName?: string | null;
    role?: string | null;
    imageUrl?: string | null;
  };
}

// ── Navigation config ────────────────────────────────────────────

const NAV_SECTIONS: readonly NavSection[] = [
  {
    items: [
      { label: "Inicio", href: "/admin", icon: HomeIcon },
    ],
  },
  {
    label: "Gestión",
    items: [
      { label: "Productos", href: "/admin/productos", icon: BoxIcon },
      { label: "Reportes", href: "/admin/reportes", icon: ChartIcon },
    ],
  },
  {
    label: "Configuración",
    items: [
      { label: "Marcas", href: "/admin/marcas", icon: TagIcon },
      { label: "Tiendas", href: "/admin/tiendas", icon: StoreIcon },
      { label: "Zonas", href: "/admin/zonas", icon: MapIcon },
      { label: "Equipo", href: "/admin/equipo", icon: TeamIcon },
      { label: "Configuración", href: "/admin/configuracion", icon: SettingsIcon },
      { label: "Auditoría", href: "/admin/auditoria", icon: ShieldIcon },
    ],
  },
];

// ── Sidebar content (shared between desktop & mobile) ────────────

function SidebarContent({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const { collapsed, toggleCollapsed } = useSidebar();

  async function handleSignOut() {
    await signOut({ redirectUrl: "/sign-in" });
    router.refresh();
  }

  return (
    <>
      {/* Logo + collapse toggle */}
      <div className={cn(
        "relative flex h-16 shrink-0 items-center border-b border-sidebar-border/50 px-4",
        collapsed ? "justify-center" : "justify-between"
      )}>
        <div className={cn("flex items-center overflow-hidden", collapsed && "justify-center")}>
          <LorealLogo
            width={collapsed ? 24 : 150}
            className="text-sidebar-accent-foreground"
          />
        </div>
        {!collapsed && (
          <button
            onClick={toggleCollapsed}
            className="hidden size-7 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/40 transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:flex"
            aria-label="Colapsar sidebar"
          >
            <CollapseIcon className="size-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="hidden justify-center px-2 pt-3 pb-1 md:flex">
          <button
            onClick={toggleCollapsed}
            className="flex size-8 items-center justify-center rounded-lg text-sidebar-foreground/40 transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label="Expandir sidebar"
          >
            <CollapseIcon className="size-4 rotate-180" />
          </button>
        </div>
      )}

      {/* Global Create menu */}
      <CreateMenuButton role="admin" />

      {/* Navigation — generous Ma spacing between sections */}
      <nav className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-3 py-4">
        {NAV_SECTIONS.map((section, i) => {
          return (
            <div key={i}>
              {section.label && !collapsed && (
                <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.12em] text-sidebar-foreground/35">
                  {section.label}
                </p>
              )}
              {section.label && collapsed && (
                <div className="mx-auto mb-2 h-px w-5 bg-sidebar-foreground/10" />
              )}
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);

                  const link = (
                    <Link
                      href={item.href}
                      className={cn(
                        "group relative flex items-center rounded-xl text-[13px] font-medium transition-all duration-200",
                        collapsed
                          ? "justify-center size-10 mx-auto"
                          : "gap-2.5 px-2.5 py-2",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      {/* Active indicator — subtle gold bar */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-sidebar-primary" />
                      )}
                      <item.icon className={cn(
                        "size-[18px] shrink-0 transition-opacity duration-200",
                        isActive ? "opacity-90" : "opacity-50 group-hover:opacity-70"
                      )} />
                      {!collapsed && item.label}
                    </Link>
                  );

                  if (collapsed) {
                    return (
                      <li key={item.href}>
                        <Tooltip.Provider>
                          <Tooltip.Root>
                            <Tooltip.Trigger render={link} />
                            <Tooltip.Portal>
                              <Tooltip.Positioner side="right" sideOffset={10}>
                                <Tooltip.Popup className="rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-lg">
                                  {item.label}
                                </Tooltip.Popup>
                              </Tooltip.Positioner>
                            </Tooltip.Portal>
                          </Tooltip.Root>
                        </Tooltip.Provider>
                      </li>
                    );
                  }

                  return <li key={item.href}>{link}</li>;
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* User footer — refined with breathing room */}
      <div className="border-t border-sidebar-border/50 px-3 py-3">
        <div className={cn(
          "flex items-center rounded-xl",
          collapsed ? "justify-center py-1.5" : "gap-2.5 px-1 py-1"
        )}>
          {/* Avatar + name → "Mi perfil". The whole identity strip is the
              affordance because that matches how Linear/Notion/Vercel handle
              it: the user chip in the footer IS the profile entry point. */}
          {collapsed ? (
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger
                  render={
                    <Link
                      href="/admin/account"
                      aria-label="Mi perfil"
                      className="flex items-center justify-center rounded-lg p-1.5 transition-colors duration-200 hover:bg-sidebar-accent"
                    >
                      <Avatar
                        name={user.fullName ?? "?"}
                        src={user.imageUrl ?? undefined}
                        size="sm"
                      />
                    </Link>
                  }
                />
                <Tooltip.Portal>
                  <Tooltip.Positioner side="right" sideOffset={10}>
                    <Tooltip.Popup className="rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-lg">
                      Mi perfil
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          ) : (
            <Link
              href="/admin/account"
              aria-label="Mi perfil"
              className={cn(
                "group flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1.5 py-1.5 transition-colors duration-200 hover:bg-sidebar-accent/60",
                pathname.startsWith("/admin/account") && "bg-sidebar-accent",
              )}
            >
              <Avatar
                name={user.fullName ?? "?"}
                src={user.imageUrl ?? undefined}
                size="sm"
              />
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <span className="truncate text-xs font-medium text-sidebar-foreground">
                  {user.fullName}
                </span>
                <span className="truncate text-[10px] text-sidebar-foreground/40">
                  Administrador
                </span>
              </div>
            </Link>
          )}
          {!collapsed && (
            <>
              <ProfileSwitcherTrigger variant="admin" />
              <button
                onClick={handleSignOut}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/30 transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label="Cerrar sesión"
              >
                <LogOutIcon className="size-3.5" />
              </button>
            </>
          )}
        </div>
        {collapsed && (
          <div className="flex flex-col items-center gap-1.5 pt-1.5">
            <ProfileSwitcherTrigger variant="admin" collapsed />
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger
                  render={
                    <button
                      onClick={handleSignOut}
                      className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/30 transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      aria-label="Cerrar sesión"
                    />
                  }
                >
                  <LogOutIcon className="size-3.5" />
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Positioner side="right" sideOffset={10}>
                    <Tooltip.Popup className="rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-lg">
                      Cerrar sesión
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        )}
      </div>
    </>
  );
}

// ── Desktop sidebar ──────────────────────────────────────────────

export function DashboardSidebar({ user }: SidebarProps) {
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();
  // Mount the mobile drawer only once the user has opened it, so the two
  // <SidebarContent> trees never coexist during SSR/first render. Otherwise
  // base-ui's useId-generated IDs (Menu.Trigger, SelectTrigger, Input, ...)
  // get assigned in a different order on the client and trigger a hydration
  // mismatch that cascades through the page.
  const [hasOpenedMobile, setHasOpenedMobile] = useState(false);
  useEffect(() => {
    if (mobileOpen) setHasOpenedMobile(true);
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-sidebar-border/50 bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] md:flex",
          collapsed ? "w-[68px]" : "w-[260px]"
        )}
      >
        <SidebarContent user={user} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Mobile drawer — mounted lazily on first open to avoid duplicate
          useId trees during SSR (see hasOpenedMobile comment above). */}
      {hasOpenedMobile && (
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[280px] flex-col border-r border-sidebar-border/50 bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] md:hidden",
            mobileOpen ? "translate-x-0 flex" : "-translate-x-full"
          )}
        >
          <SidebarContent user={user} />
        </aside>
      )}
    </>
  );
}

/* ─── Inline SVG icons ─── */

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3" />
      <path d="M10 11l3-3-3-3" />
      <path d="M13 8H6" />
    </svg>
  );
}

function CollapseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3L5 8l5 5" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6.5L8 2l6 4.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6.5z" />
      <path d="M6 14V9h4v5" />
    </svg>
  );
}


function BoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 5l6-3 6 3-6 3-6-3z" />
      <path d="M2 5v6l6 3V8" />
      <path d="M14 5v6l-6 3V8" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 14V8l3.5-2 3 4L12 4l2 2" />
    </svg>
  );
}

function StoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6l1-4h10l1 4" />
      <path d="M2 6c0 1.1.9 2 2 2s2-.9 2-2c0 1.1.9 2 2 2s2-.9 2-2c0 1.1.9 2 2 2s2-.9 2-2" />
      <path d="M2 8v6h12V8" />
      <path d="M6 14v-4h4v4" />
    </svg>
  );
}

function TeamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="4.5" r="2.5" />
      <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2h5.5l6.5 6.5-5.5 5.5L2 7.5V2z" />
      <circle cx="5.5" cy="5.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 3.5l4.5-1.5 5 2 4.5-1.5v11l-4.5 1.5-5-2L1 14.5z" />
      <path d="M5.5 2v11M10.5 4v11" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5L2.5 4v4c0 3.5 2.5 5.5 5.5 6.5 3-1 5.5-3 5.5-6.5V4L8 1.5z" />
      <path d="M6 8l1.5 1.5L10 6.5" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <path d="M13.4 10a1.2 1.2 0 00.2 1.3l.04.04a1.44 1.44 0 01-1.02 2.46 1.44 1.44 0 01-1.02-.42l-.04-.04a1.2 1.2 0 00-1.3-.2 1.2 1.2 0 00-.72 1.1v.12a1.44 1.44 0 01-2.88 0v-.06a1.2 1.2 0 00-.78-1.1 1.2 1.2 0 00-1.3.2l-.04.04a1.44 1.44 0 11-2.04-2.04l.04-.04a1.2 1.2 0 00.2-1.3 1.2 1.2 0 00-1.1-.72H2.24a1.44 1.44 0 010-2.88h.06a1.2 1.2 0 001.1-.78 1.2 1.2 0 00-.2-1.3l-.04-.04A1.44 1.44 0 115.2 3.16l.04.04a1.2 1.2 0 001.3.2h.06a1.2 1.2 0 00.72-1.1V2.24a1.44 1.44 0 012.88 0v.06a1.2 1.2 0 00.72 1.1 1.2 1.2 0 001.3-.2l.04-.04a1.44 1.44 0 112.04 2.04l-.04.04a1.2 1.2 0 00-.2 1.3v.06a1.2 1.2 0 001.1.72h.12a1.44 1.44 0 010 2.88h-.06a1.2 1.2 0 00-1.1.72z" />
    </svg>
  );
}
