"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Tooltip } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";
import { useBrand } from "@/lib/hooks/use-brands";
import { useTaskCounts } from "@/lib/hooks/use-tasks";
import { AdvisorBrandLogo } from "@/components/advisor/advisor-brand-logo";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import { useBrandAdvisorStyle } from "@/components/advisor/use-brand-advisor-style";
import {
  AppointmentGlyph,
  CheckGlyph,
  MessageGlyph,
  PackageGlyph,
  RoutineMorningGlyph,
  SignOutGlyph,
  UserGlyph,
} from "@/components/ui/glyphs";
import type { SessionUser } from "@/lib/auth";

type GlyphComponent = typeof UserGlyph;

type NavItem = {
  href: string;
  label: string;
  icon: GlyphComponent;
  badgeKey?: "tasks";
};

const PRIMARY_NAV: NavItem[] = [
  { href: "/advisor/today", label: "Hoy", icon: RoutineMorningGlyph },
  { href: "/advisor/customers", label: "Mis clientas", icon: UserGlyph },
  { href: "/advisor/messages", label: "Mensajes", icon: MessageGlyph },
  { href: "/advisor/appointments", label: "Citas", icon: AppointmentGlyph },
  { href: "/advisor/tasks", label: "Tareas", icon: CheckGlyph, badgeKey: "tasks" },
];

const SECONDARY_NAV: NavItem[] = [
  { href: "/advisor/catalog", label: "Catálogo", icon: PackageGlyph },
];

interface Props {
  user: SessionUser;
  /** Called when a nav link is followed — lets the drawer close itself. */
  onNavigate?: () => void;
  /** Icon-only rail mode for tablet portrait. */
  collapsed?: boolean;
}

/**
 * The internal anatomy of the advisor sidebar — logo, primary/secondary nav,
 * staff footer + sign out. Rendered both in the fixed sidebar (`AdvisorSidebar`)
 * and inside the customer-360 drawer. When `collapsed` it renders as an
 * icon-only rail with tooltips (Material 3 navigation rail pattern).
 */
export function AdvisorNav({ user, onNavigate, collapsed = false }: Props) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { data: brand } = useBrand(user.brandId ?? "");
  const { data: taskCounts } = useTaskCounts();
  const brandStyle = useBrandAdvisorStyle(user.brandId);

  const badges: Record<string, number | undefined> = {
    tasks: taskCounts?.pending,
  };

  function handleSignOut() {
    signOut({ redirectUrl: "/sign-in" });
  }

  return (
    <div
      style={brandStyle}
      className="flex h-full w-full flex-col bg-[color:var(--ba-sidebar)] text-[color:var(--ba-sidebar-foreground)]"
    >
      <div
        className={cn(
          "flex h-20 items-center",
          collapsed ? "justify-center px-2" : "px-6",
        )}
      >
        <AdvisorBrandLogo
          role={user.role}
          brandCode={brand?.code}
          width={
            collapsed
              ? 36
              : brand?.code?.toUpperCase() === "LANCOME"
                ? 140
                : 110
          }
          className="text-[color:var(--ba-sidebar-foreground)]"
        />
      </div>

      <NavSection
        items={PRIMARY_NAV}
        pathname={pathname}
        badges={badges}
        onNavigate={onNavigate}
        collapsed={collapsed}
      />
      <div className="mx-3 my-3 border-t border-[color:var(--ba-sidebar-border)]" />
      <NavSection
        items={SECONDARY_NAV}
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
                  <div
                    className="flex items-center justify-center py-1.5"
                    aria-label={user.fullName || "Asesora de belleza"}
                  >
                    <CustomerAvatar
                      firstName={user.fullName || "Asesora de belleza"}
                      avatarUrl={user.imageUrl}
                      size="sm"
                    />
                  </div>
                }
              />
              <Tooltip.Portal>
                <Tooltip.Positioner side="right" sideOffset={10}>
                  <Tooltip.Popup className="rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-lg">
                    {user.fullName || "Asesora de belleza"}
                  </Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        ) : (
          <div className="flex items-center gap-3 px-2 py-2">
            <CustomerAvatar
              firstName={user.fullName || "Asesora de belleza"}
              avatarUrl={user.imageUrl}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[color:var(--ba-sidebar-foreground)]">
                {user.fullName || "Asesora de belleza"}
              </p>
              <p className="truncate text-xs text-[color:var(--ba-sidebar-muted)]">
                {user.email}
              </p>
            </div>
          </div>
        )}
        {collapsed ? (
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger
                render={
                  <button
                    type="button"
                    onClick={handleSignOut}
                    aria-label="Cerrar sesión"
                    className="mt-1 flex h-10 w-full items-center justify-center rounded-md text-[color:var(--ba-sidebar-foreground)] transition-colors hover:bg-[color:var(--ba-sidebar-active)]"
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
            className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[color:var(--ba-sidebar-foreground)] transition-colors hover:bg-[color:var(--ba-sidebar-active)]"
          >
            <SignOutGlyph className="size-4 opacity-80" aria-hidden />
            Cerrar sesión
          </button>
        )}
      </div>
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
