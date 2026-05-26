"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserGlyph,
  LockGlyph,
  SettingsGlyph,
  ActivityGlyph,
} from "@/components/ui/glyphs";

type GlyphComponent = typeof UserGlyph;

interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: GlyphComponent;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: "Mi cuenta",
    items: [
      {
        href: "/advisor/account",
        label: "Cuenta",
        description: "Foto, nombre y datos de tu cuenta",
        icon: UserGlyph,
      },
      {
        href: "/advisor/security",
        label: "Seguridad",
        description: "Contraseña y sesiones activas",
        icon: LockGlyph,
      },
      {
        href: "/advisor/preferences",
        label: "Preferencias",
        description: "Canal, idioma y notificaciones",
        icon: SettingsGlyph,
      },
      {
        href: "/advisor/activity",
        label: "Actividad",
        description: "Lo que has cambiado recientemente",
        icon: ActivityGlyph,
      },
    ],
  },
];

/**
 * Secondary nav for the advisor account area — vertical rail on md+, a
 * single Select on small screens (same pattern as the dashboard settings
 * nav). Unlike the dashboard version there's no "back to dashboard" link
 * because the global advisor sidebar is always present alongside.
 */
export function AccountNav() {
  const pathname = usePathname();
  const allItems = GROUPS.flatMap((g) => g.items);
  const activeItem =
    allItems.find((item) => pathname.startsWith(item.href)) ?? allItems[0];

  return (
    <>
      <aside
        aria-label="Mi cuenta"
        className="hidden h-full w-56 shrink-0 border-r border-[color:var(--ba-sidebar-border)] bg-background px-4 py-8 md:block lg:w-60"
      >
        <nav className="space-y-6">
          {GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "relative flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-[color:var(--ba-accent-soft)] text-foreground"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        {isActive && (
                          <span
                            aria-hidden
                            className="absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2 rounded-full bg-[color:var(--ba-accent)]"
                          />
                        )}
                        <Icon className="size-4 opacity-80" aria-hidden />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="border-b border-[color:var(--ba-sidebar-border)] bg-background px-4 py-3 md:hidden">
        <MobileNav activeHref={activeItem.href} groups={GROUPS} />
      </div>
    </>
  );
}

function MobileNav({
  activeHref,
  groups,
}: {
  activeHref: string;
  groups: NavGroup[];
}) {
  return (
    <Select
      value={activeHref}
      onValueChange={(value) => {
        if (typeof window !== "undefined" && value) {
          window.location.assign(value);
        }
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecciona una sección" />
      </SelectTrigger>
      <SelectContent>
        {groups.map((group) => (
          <div key={group.label}>
            <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
              {group.label}
            </div>
            {group.items.map((item) => (
              <SelectItem key={item.href} value={item.href}>
                {item.label}
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}
