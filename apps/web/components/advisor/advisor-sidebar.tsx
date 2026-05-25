"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useTaskCounts } from "@/lib/hooks/use-tasks";
import {
  AppointmentGlyph,
  CheckGlyph,
  MessageGlyph,
  PackageGlyph,
  RoutineMorningGlyph,
  UserGlyph,
} from "@/components/ui/glyphs";

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

export function AdvisorSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { data: taskCounts } = useTaskCounts();

  const badges: Record<string, number | undefined> = {
    tasks: taskCounts?.pending,
  };

  return (
    <nav
      aria-label="Beauty Advisor navigation"
      className="hidden md:flex h-dvh w-[240px] flex-col border-r border-[color:var(--ba-sidebar-border)] bg-[color:var(--ba-sidebar)] text-[color:var(--ba-sidebar-foreground)]"
    >
      <div className="px-6 pt-7 pb-5">
        <p className="font-[var(--font-heading)] text-base tracking-[0.18em] uppercase text-foreground">
          L&apos;Oréal
        </p>
        <p className="mt-1 text-xs text-[color:var(--ba-sidebar-muted)]">
          Clienteling
        </p>
      </div>

      <div className="mx-3 mb-5 flex items-center gap-3 rounded-lg px-3 py-2">
        <UserButton
          appearance={{ elements: { avatarBox: "h-9 w-9" } }}
          afterSignOutUrl="/sign-in"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {user?.fullName ?? user?.firstName ?? "Beauty Advisor"}
          </p>
          <p className="truncate text-xs text-[color:var(--ba-sidebar-muted)]">
            {user?.primaryEmailAddress?.emailAddress ?? ""}
          </p>
        </div>
      </div>

      <SidebarSection items={PRIMARY_NAV} pathname={pathname} badges={badges} />
      <div className="mx-3 my-3 border-t border-[color:var(--ba-sidebar-border)]" />
      <SidebarSection items={SECONDARY_NAV} pathname={pathname} badges={badges} />
    </nav>
  );
}

function SidebarSection({
  items,
  pathname,
  badges,
}: {
  items: NavItem[];
  pathname: string;
  badges: Record<string, number | undefined>;
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
              className={cn(
                "group flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-[color:var(--ba-sidebar-active)] text-foreground"
                  : "text-[color:var(--ba-sidebar-foreground)] hover:bg-[color:var(--ba-sidebar-active)]/60 hover:text-foreground",
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
