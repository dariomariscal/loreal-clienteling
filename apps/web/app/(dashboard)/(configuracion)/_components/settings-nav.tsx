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
import { BackGlyph } from "@/components/ui/glyphs";

interface NavItem {
  href: string;
  label: string;
  description: string;
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
        href: "/perfil",
        label: "Perfil",
        description: "Tu foto, nombre y datos de cuenta",
      },
      {
        href: "/seguridad",
        label: "Seguridad",
        description: "Contraseña y sesiones activas",
      },
      {
        href: "/notificaciones",
        label: "Notificaciones",
        description: "Cómo te avisamos de novedades",
      },
    ],
  },
];

/**
 * Settings sub-nav. Two presentations from the same source of truth:
 *
 *  • md+: sticky vertical sidebar with grouped headers, the industry-standard
 *    settings IA used by GitHub/Linear/Notion/Stripe.
 *
 *  • <md: a single `<Select>` underneath the page header so the user never
 *    loses ~200px to a secondary sidebar on phones/tablets. Tabs were
 *    considered but they cap at ~4 items before they wrap or scroll, and we
 *    plan to grow this list.
 */
export function SettingsNav() {
  const pathname = usePathname();
  const allItems = GROUPS.flatMap((g) => g.items);
  const activeItem =
    allItems.find((item) => pathname.startsWith(item.href)) ?? allItems[0];

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        aria-label="Configuración"
        className="sticky top-0 hidden h-fit shrink-0 self-start md:block md:w-56 lg:w-60"
      >
        <Link
          href="/"
          className="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <BackGlyph className="size-3.5" />
          Volver al dashboard
        </Link>

        <nav className="space-y-6">
          {GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "relative flex items-center rounded-lg px-2 py-1.5 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        {isActive && (
                          <span
                            aria-hidden
                            className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-primary"
                          />
                        )}
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

      {/* Mobile dropdown */}
      <div className="mb-4 md:hidden">
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
  // Wrapping <Link> around <SelectItem> would hijack the option keyboard
  // behavior, so we use a controlled select that pushes the route on change.
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
