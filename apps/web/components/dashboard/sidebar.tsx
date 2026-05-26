"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";
import { useClerk } from "@clerk/nextjs";
import { useSidebar } from "@/components/dashboard/sidebar-context";
import { useBrand } from "@/lib/hooks/use-brands";
import { LorealLogo, LancomeLogo, YslLogo } from "@/components/ui/brand-logos";
import { Avatar } from "@/components/ui/avatar";
import { CreateMenuButton } from "@/components/dashboard/create-menu-button";
import type { UserRole } from "@loreal/contracts";

// ── Types ────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: readonly UserRole[];
}

interface NavSection {
  label?: string;
  items: readonly NavItem[];
}

interface SidebarProps {
  user: {
    fullName?: string | null;
    role?: string | null;
    brandId?: string | null;
    imageUrl?: string | null;
  };
}

// ── Navigation config ────────────────────────────────────────────

const NAV_SECTIONS: readonly NavSection[] = [
  {
    items: [
      { label: "Inicio", href: "/", icon: HomeIcon, roles: ["ba", "manager", "supervisor", "admin"] },
      { label: "Clientes", href: "/clientes", icon: UsersIcon, roles: ["ba", "manager", "supervisor", "admin"] },
      { label: "Agenda", href: "/agenda", icon: CalendarIcon, roles: ["ba"] },
    ],
  },
  {
    label: "Gestión",
    items: [
      { label: "Productos", href: "/productos", icon: BoxIcon, roles: ["ba", "manager", "supervisor", "admin"] },
      { label: "Reportes", href: "/reportes", icon: ChartIcon, roles: ["manager", "supervisor", "admin"] },
      { label: "Mensajes", href: "/mensajes", icon: MegaphoneIcon, roles: ["ba", "manager", "admin"] },
    ],
  },
  {
    label: "Configuración",
    items: [
      { label: "Marcas", href: "/marcas", icon: TagIcon, roles: ["admin"] },
      { label: "Tiendas", href: "/tiendas", icon: StoreIcon, roles: ["admin", "supervisor"] },
      { label: "Zonas", href: "/zonas", icon: MapIcon, roles: ["admin", "supervisor"] },
      { label: "Equipo", href: "/equipo", icon: TeamIcon, roles: ["manager", "admin"] },
      { label: "Configuración", href: "/configuracion", icon: SettingsIcon, roles: ["admin"] },
      { label: "Auditoría", href: "/auditoria", icon: ShieldIcon, roles: ["admin"] },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  ba: "Beauty Advisor",
  manager: "Gerente",
  supervisor: "Supervisor",
  admin: "Administrador",
};

// ── Sidebar content (shared between desktop & mobile) ────────────

/** Returns the correct brand logo component based on user role and brand code */
function BrandLogo({ role, brandCode, collapsed }: { role: string; brandCode?: string; collapsed: boolean }) {
  const logoClass = "text-sidebar-accent-foreground";
  const size = collapsed ? 24 : 56;

  // Admin without brand → central L'Oréal logo
  if (role === "admin" && !brandCode) {
    return <LorealLogo width={collapsed ? 24 : 150} className={logoClass} />;
  }

  const code = brandCode?.toUpperCase();

  if (code === "YSL") {
    return <YslLogo width={size * 2.4} className={logoClass} />;
  }

  if (code === "LANCOME") {
    return <LancomeLogo width={size * 2.4} className={logoClass} />;
  }

  // Default: Lancôme for any other brand
  return <LancomeLogo width={size * 2.4} className={logoClass} />;
}

function SidebarContent({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const { collapsed, toggleCollapsed } = useSidebar();
  const role = user.role ?? "ba";
  const { data: brand } = useBrand(user.brandId ?? "");

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
          <BrandLogo role={role} brandCode={brand?.code} collapsed={collapsed} />
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
      <CreateMenuButton role={role} />

      {/* Navigation — generous Ma spacing between sections */}
      <nav className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-3 py-4">
        {NAV_SECTIONS.map((section, i) => {
          const visibleItems = section.items.filter((item) =>
            item.roles.includes(role as UserRole),
          );
          if (visibleItems.length === 0) return null;

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
                {visibleItems.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
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
                      href="/perfil"
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
              href="/perfil"
              aria-label="Mi perfil"
              className={cn(
                "group flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1.5 py-1.5 transition-colors duration-200 hover:bg-sidebar-accent/60",
                pathname.startsWith("/perfil") && "bg-sidebar-accent",
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
                  {ROLE_LABELS[role] ?? role}
                </span>
              </div>
            </Link>
          )}
          {!collapsed && (
            <button
              onClick={handleSignOut}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/30 transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label="Cerrar sesión"
            >
              <LogOutIcon className="size-3.5" />
            </button>
          )}
        </div>
        {collapsed && (
          <div className="flex justify-center pt-1.5">
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

// ── Brand tinting ────────────────────────────────────────────────
// Subtle wash of the brand's primaryColor over the default sidebar
// tokens. color-mix keeps the sidebar dark and legible while picking
// up the brand vibe. Empty object → default tokens.
function useBrandSidebarStyle(brandId: string | null | undefined): React.CSSProperties {
  const { data: brand } = useBrand(brandId ?? "");
  // Single-brand listing flattens primaryColor onto the brand row; the
  // detail endpoint nests it under `config`. Read both so we don't care
  // which one populated the cache first.
  const primary = brand?.config?.primaryColor ?? brand?.primaryColor;
  if (!primary) return {};
  return {
    "--sidebar": `color-mix(in oklab, ${primary} 18%, oklch(0.13 0.005 285))`,
    "--sidebar-accent": `color-mix(in oklab, ${primary} 28%, oklch(0.22 0.005 285))`,
    "--sidebar-border": `color-mix(in oklab, ${primary} 22%, oklch(0.25 0.005 285))`,
    "--sidebar-ring": primary,
    "--sidebar-primary": primary,
  } as React.CSSProperties;
}

// ── Desktop sidebar ──────────────────────────────────────────────

export function DashboardSidebar({ user }: SidebarProps) {
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();
  const pathname = usePathname();
  const brandStyle = useBrandSidebarStyle(user.brandId);
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
        style={brandStyle}
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
          style={brandStyle}
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

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="5" r="2.5" />
      <path d="M1.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" />
      <circle cx="11.5" cy="5.5" r="1.5" />
      <path d="M11.5 9c1.5 0 3 1.2 3 3.5" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="12" height="11" rx="1" />
      <path d="M5 1.5v2M11 1.5v2M2 7h12" />
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

function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 3v8l-7-2V5l7-2z" />
      <path d="M6 5v6l-2 2.5V7.5" />
      <circle cx="14" cy="7" r="0.5" fill="currentColor" />
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

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5l-4-4z" />
      <path d="M9 1v4h4" />
      <path d="M5.5 8.5h5M5.5 11h3" />
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
