"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
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
  { href: "/advisor/today", label: "Today", icon: RoutineMorningGlyph },
  { href: "/advisor/customers", label: "My Clients", icon: UserGlyph },
  { href: "/advisor/messages", label: "Messages", icon: MessageGlyph },
  { href: "/advisor/appointments", label: "Appointments", icon: AppointmentGlyph },
  { href: "/advisor/tasks", label: "Tasks", icon: CheckGlyph, badgeKey: "tasks" },
];

const SECONDARY_NAV: NavItem[] = [
  { href: "/advisor/catalog", label: "Catalog", icon: PackageGlyph },
];

interface Props {
  user: SessionUser;
  /** Called when a nav link is followed — lets the drawer close itself. */
  onNavigate?: () => void;
}

/**
 * The internal anatomy of the advisor sidebar — logo, primary/secondary nav,
 * staff footer + sign out. Rendered both in the fixed sidebar (`AdvisorSidebar`)
 * and inside the customer-360 drawer.
 */
export function AdvisorNav({ user, onNavigate }: Props) {
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
      <div className="flex h-20 items-center px-6">
        <AdvisorBrandLogo
          role={user.role}
          brandCode={brand?.code}
          width={brand?.code?.toUpperCase() === "LANCOME" ? 140 : 110}
          className="text-[color:var(--ba-sidebar-foreground)]"
        />
      </div>

      <NavSection
        items={PRIMARY_NAV}
        pathname={pathname}
        badges={badges}
        onNavigate={onNavigate}
      />
      <div className="mx-3 my-3 border-t border-[color:var(--ba-sidebar-border)]" />
      <NavSection
        items={SECONDARY_NAV}
        pathname={pathname}
        badges={badges}
        onNavigate={onNavigate}
      />

      <div className="mt-auto border-t border-[color:var(--ba-sidebar-border)] px-3 py-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <CustomerAvatar
            firstName={user.fullName || "Beauty Advisor"}
            avatarUrl={user.imageUrl}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[color:var(--ba-sidebar-foreground)]">
              {user.fullName || "Beauty Advisor"}
            </p>
            <p className="truncate text-xs text-[color:var(--ba-sidebar-muted)]">
              {user.email}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[color:var(--ba-sidebar-foreground)] transition-colors hover:bg-[color:var(--ba-sidebar-active)]"
        >
          <SignOutGlyph className="size-4 opacity-80" aria-hidden />
          Sign out
        </button>
      </div>
    </div>
  );
}

function NavSection({
  items,
  pathname,
  badges,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  badges: Record<string, number | undefined>;
  onNavigate?: () => void;
}) {
  return (
    <ul className="flex flex-col gap-0.5 px-3">
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const badge = item.badgeKey ? badges[item.badgeKey] : undefined;

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
              {badge && badge > 0 ? (
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
