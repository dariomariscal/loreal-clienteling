"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Tooltip } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import { useApprovalRequests } from "@/lib/hooks/use-approval-requests";
import { LorealLogo } from "@/components/ui/brand-logos";
import {
  ActivityGlyph,
  AppointmentGlyph,
  BrandGlyph,
  CalendarPlusGlyph,
  CheckCircleGlyph,
  HeatmapGlyph,
  PackageGlyph,
  PulseGlyph,
  SegmentGlyph,
  SignOutGlyph,
  SparkleDotGlyph,
  StoreGlyph,
  TeamGlyph,
  TemplateGlyph,
  UserGlyph,
  ZonesGlyph,
} from "@/components/ui/glyphs";
import type { SessionUser } from "@/lib/auth";
import { ProfileSwitcherTrigger } from "@/components/auth/profile-switcher-trigger";

const ACCOUNT_HREF = "/advisor/account";

type GlyphComponent = typeof UserGlyph;
type BadgeKey = "approvals";

type NavItem = {
  href: string;
  label: string;
  icon: GlyphComponent;
  badgeKey?: BadgeKey;
};

/**
 * Three-tier nav for the National Retail Manager.
 *
 * Tier 1 (Operación) — pulse-style daily destinations + roll-up rankings.
 * Tier 2 (Configuración) — the screens that ARE the NRM's job: brand
 * identity, message templates, audience segments. These are exclusive to
 * this role and deserve their own section so they don't feel buried.
 * Tier 3 (Análisis) — full-bleed exploration: heatmap, inventory matrix,
 * audit summary. These break the chasis on purpose.
 */
const OPERATION_NAV: NavItem[] = [
  { href: "/national/today", label: "Vista nacional", icon: PulseGlyph },
  { href: "/national/zones", label: "Zonas", icon: ZonesGlyph },
  { href: "/national/stores", label: "Tiendas", icon: StoreGlyph },
  { href: "/national/team", label: "Equipo", icon: TeamGlyph },
  { href: "/national/customers", label: "Clientas", icon: SparkleDotGlyph },
  { href: "/national/appointments", label: "Citas", icon: AppointmentGlyph },
  { href: "/national/events", label: "Eventos", icon: CalendarPlusGlyph },
  {
    href: "/national/approvals",
    label: "Aprobaciones",
    icon: CheckCircleGlyph,
    badgeKey: "approvals",
  },
];

const CONFIG_NAV: NavItem[] = [
  { href: "/national/brands", label: "Marcas", icon: BrandGlyph },
  { href: "/national/templates", label: "Plantillas", icon: TemplateGlyph },
  { href: "/national/segments", label: "Segmentos", icon: SegmentGlyph },
];

const ANALYSIS_NAV: NavItem[] = [
  { href: "/national/heatmap", label: "Mapa nacional", icon: HeatmapGlyph },
  { href: "/national/inventory", label: "Inventario", icon: PackageGlyph },
  { href: "/national/audit", label: "Auditoría", icon: ActivityGlyph },
];

interface Props {
  user: SessionUser;
  /** Called when a nav link is followed — lets a drawer host close itself. */
  onNavigate?: () => void;
  /** Icon-only rail mode for tablet portrait. */
  collapsed?: boolean;
}

export function NationalNav({ user, onNavigate, collapsed = false }: Props) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { data: pendingApprovals } = useApprovalRequests({ status: "pending" });

  const badges: Record<BadgeKey, number | undefined> = {
    approvals: pendingApprovals?.length,
  };

  function handleSignOut() {
    signOut({ redirectUrl: "/sign-in" });
  }

  return (
    <div className="flex h-full w-full flex-col bg-[color:var(--ba-sidebar)] text-[color:var(--ba-sidebar-foreground)]">
      <div
        className={cn(
          "flex h-20 items-center",
          collapsed ? "justify-center px-2" : "px-6",
        )}
      >
        <LorealLogo
          width={collapsed ? 32 : 100}
          className="text-[color:var(--ba-sidebar-foreground)]"
        />
      </div>

      <NavSection
        items={OPERATION_NAV}
        pathname={pathname}
        badges={badges}
        onNavigate={onNavigate}
        collapsed={collapsed}
      />
      <NavSectionDivider label="Configuración" collapsed={collapsed} />
      <NavSection
        items={CONFIG_NAV}
        pathname={pathname}
        badges={badges}
        onNavigate={onNavigate}
        collapsed={collapsed}
      />
      <NavSectionDivider label="Análisis" collapsed={collapsed} />
      <NavSection
        items={ANALYSIS_NAV}
        pathname={pathname}
        badges={badges}
        onNavigate={onNavigate}
        collapsed={collapsed}
      />

      <div
        className={cn(
          "mt-auto border-t border-[color:var(--ba-sidebar-border)] py-3",
          collapsed ? "px-2" : "px-3",
        )}
      >
        {collapsed ? (
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger
                render={
                  <Link
                    href={ACCOUNT_HREF}
                    onClick={onNavigate}
                    aria-label={`${user.fullName || "National Retail Manager"} — Mi cuenta`}
                    className={cn(
                      "flex items-center justify-center rounded-md py-1.5 transition-colors hover:bg-[color:var(--ba-sidebar-active)]",
                      pathname.startsWith(ACCOUNT_HREF) &&
                        "bg-[color:var(--ba-sidebar-active)]",
                    )}
                  >
                    <CustomerAvatar
                      firstName={user.fullName || "NRM"}
                      avatarUrl={user.imageUrl}
                      size="sm"
                    />
                  </Link>
                }
              />
              <Tooltip.Portal>
                <Tooltip.Positioner side="right" sideOffset={10}>
                  <Tooltip.Popup className="rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-lg">
                    {user.fullName || "National Retail Manager"}
                  </Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        ) : (
          <Link
            href={ACCOUNT_HREF}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-[color:var(--ba-sidebar-active)]",
              pathname.startsWith(ACCOUNT_HREF) &&
                "bg-[color:var(--ba-sidebar-active)]",
            )}
          >
            <CustomerAvatar
              firstName={user.fullName || "NRM"}
              avatarUrl={user.imageUrl}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[color:var(--ba-sidebar-foreground)]">
                {user.fullName || "National Retail Manager"}
              </p>
              <p className="truncate text-xs text-[color:var(--ba-sidebar-muted)]">
                {user.email}
              </p>
            </div>
          </Link>
        )}
        <div className={cn("mt-1 flex gap-1", collapsed ? "flex-col" : "items-center")}>
          <ProfileSwitcherTrigger variant="role" collapsed={collapsed} />
          {collapsed ? (
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger
                  render={
                    <button
                      type="button"
                      onClick={handleSignOut}
                      aria-label="Cerrar sesión"
                      className="flex h-10 w-full items-center justify-center rounded-md text-[color:var(--ba-sidebar-foreground)] transition-colors hover:bg-[color:var(--ba-sidebar-active)]"
                    >
                      <SignOutGlyph className="size-4 opacity-80" aria-hidden />
                    </button>
                  }
                />
                <Tooltip.Portal>
                  <Tooltip.Positioner side="right" sideOffset={10}>
                    <Tooltip.Popup className="rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-lg">
                      Cerrar sesión
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          ) : (
            <button
              type="button"
              onClick={handleSignOut}
              className="flex flex-1 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[color:var(--ba-sidebar-foreground)] transition-colors hover:bg-[color:var(--ba-sidebar-active)]"
            >
              <SignOutGlyph className="size-4 opacity-80" aria-hidden />
              Cerrar sesión
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function NavSectionDivider({
  label,
  collapsed,
}: {
  label: string;
  collapsed: boolean;
}) {
  if (collapsed) {
    return (
      <div
        aria-hidden
        className="mx-3 my-3 border-t border-[color:var(--ba-sidebar-border)]"
      />
    );
  }
  return (
    <div className="mt-4 mb-1 px-6">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--ba-sidebar-muted)]">
        {label}
      </p>
    </div>
  );
}

function NavSection({
  items,
  pathname,
  badges,
  onNavigate,
  collapsed,
}: {
  items: NavItem[];
  pathname: string;
  badges: Record<string, number | undefined>;
  onNavigate?: () => void;
  collapsed: boolean;
}) {
  return (
    <ul className={cn("flex flex-col gap-0.5", collapsed ? "px-2" : "px-3")}>
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const badge = item.badgeKey ? badges[item.badgeKey] : undefined;
        const hasBadge = badge && badge > 0;

        if (collapsed) {
          return (
            <li key={item.href}>
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger
                    render={
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-label={item.label}
                        className={cn(
                          "group relative flex h-10 items-center justify-center rounded-md transition-colors",
                          active
                            ? "bg-[color:var(--ba-sidebar-active)] text-[color:var(--ba-sidebar-foreground)]"
                            : "text-[color:var(--ba-sidebar-foreground)]/80 hover:bg-[color:var(--ba-sidebar-active)]/60 hover:text-[color:var(--ba-sidebar-foreground)]",
                        )}
                      >
                        <Icon className="size-5 opacity-90" aria-hidden />
                        {hasBadge ? (
                          <span className="absolute top-1 right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--ba-accent)] px-1 text-[10px] font-semibold text-[color:var(--ba-accent-foreground)]">
                            {badge}
                          </span>
                        ) : null}
                      </Link>
                    }
                  />
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

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-[color:var(--ba-sidebar-active)] text-[color:var(--ba-sidebar-foreground)]"
                  : "text-[color:var(--ba-sidebar-foreground)]/80 hover:bg-[color:var(--ba-sidebar-active)]/60 hover:text-[color:var(--ba-sidebar-foreground)]",
              )}
            >
              <Icon className="size-4 opacity-80" aria-hidden />
              <span className="flex-1 truncate">{item.label}</span>
              {hasBadge ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--ba-accent)] px-1.5 text-[10px] font-semibold text-[color:var(--ba-accent-foreground)]">
                  {badge}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
