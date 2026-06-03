"use client";

import { useState } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";
import { SwitchProfileGlyph } from "@/components/ui/glyphs";
import { ProfileSwitcherDialog } from "@/components/auth/profile-switcher-dialog";

/**
 * The four role sidebars use two distinct token palettes:
 *
 *   - admin   → `sidebar-foreground` / `sidebar-accent` (shadcn tokens)
 *   - role    → `--ba-sidebar-foreground` / `--ba-sidebar-active`
 *
 * One variant per palette keeps the trigger pixel-aligned with the existing
 * sign-out button in each shell without leaking palette names into the
 * trigger's API.
 */
type Variant = "admin" | "role";

interface ProfileSwitcherTriggerProps {
  variant: Variant;
  collapsed?: boolean;
}

/**
 * Sidebar entry point for the streaming-style profile picker. Renders as a
 * discrete icon button alongside the sign-out button — same size and shape
 * as the existing footer affordances — and owns the dialog open state.
 *
 * Drop one of these into each sidebar footer; nothing else to wire.
 */
export function ProfileSwitcherTrigger({
  variant,
  collapsed = false,
}: ProfileSwitcherTriggerProps) {
  const [open, setOpen] = useState(false);
  const styles = VARIANT_STYLES[variant];
  const label = "Cambiar de perfil";

  const button = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={label}
      className={cn(styles.base, collapsed ? styles.collapsed : styles.expanded)}
    >
      <SwitchProfileGlyph className={styles.icon} aria-hidden />
    </button>
  );

  return (
    <>
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger render={button} />
          <Tooltip.Portal>
            <Tooltip.Positioner side={collapsed ? "right" : "top"} sideOffset={10}>
              <Tooltip.Popup className="rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-lg">
                {label}
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
      <ProfileSwitcherDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

const VARIANT_STYLES: Record<
  Variant,
  { base: string; expanded: string; collapsed: string; icon: string }
> = {
  admin: {
    base: "flex shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/30 transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    expanded: "size-8",
    collapsed: "size-9",
    icon: "size-3.5",
  },
  role: {
    base: "flex shrink-0 items-center justify-center rounded-md text-[color:var(--ba-sidebar-foreground)] transition-colors hover:bg-[color:var(--ba-sidebar-active)]",
    expanded: "size-8",
    collapsed: "h-10 w-full",
    icon: "size-4 opacity-80",
  },
};
