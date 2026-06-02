"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tooltip } from "@base-ui/react/tooltip";
import { BellGlyph } from "@/components/ui/glyphs";
import { useUnreadCount } from "@/lib/hooks/use-notifications";
import { cn } from "@/lib/utils";
import { NotificationsDropdown } from "./notifications-dropdown";

interface Props {
  /** Icon-only rail mode for tablet portrait sidebar. */
  collapsed?: boolean;
}

/**
 * Bell button rendered inside the advisor sidebar. Shows a small red dot
 * (and the unread count when ≥ 1) and opens the inbox dropdown in a right
 * Sheet. Polls the unread count every 30s via useUnreadCount.
 */
export function NotificationsBell({ collapsed = false }: Props) {
  const [open, setOpen] = React.useState(false);
  const { data } = useUnreadCount();
  const total = data?.total ?? 0;
  const hasUrgent = (data?.urgent ?? 0) > 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {collapsed ? (
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger
              render={
                <SheetTrigger
                  render={
                    <BellButton
                      collapsed
                      total={total}
                      hasUrgent={hasUrgent}
                    />
                  }
                />
              }
            />
            <Tooltip.Portal>
              <Tooltip.Positioner side="right" sideOffset={10}>
                <Tooltip.Popup className="rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-lg">
                  Notificaciones
                </Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      ) : (
        <SheetTrigger
          render={<BellButton total={total} hasUrgent={hasUrgent} />}
        />
      )}

      <SheetContent size="default" className="p-0">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle>Notificaciones</SheetTitle>
        </SheetHeader>
        <NotificationsDropdown
          onItemClick={() => setOpen(false)}
          unreadTotal={total}
        />
      </SheetContent>
    </Sheet>
  );
}

interface BellButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  total: number;
  hasUrgent: boolean;
  collapsed?: boolean;
}

/**
 * Visual presentation only — the parent wires up the Sheet trigger via the
 * Base UI `render` prop, so this stays a dumb button.
 */
const BellButton = React.forwardRef<HTMLButtonElement, BellButtonProps>(
  function BellButton(
    { total, hasUrgent, collapsed = false, className, ...rest },
    ref,
  ) {
    const hasUnread = total > 0;
    const label = hasUnread
      ? `Notificaciones (${total} sin leer)`
      : "Notificaciones";

    if (collapsed) {
      return (
        <button
          ref={ref}
          type="button"
          aria-label={label}
          className={cn(
            "relative flex h-10 w-full items-center justify-center rounded-md text-[color:var(--ba-sidebar-foreground)]/80 transition-colors hover:bg-[color:var(--ba-sidebar-active)]/60 hover:text-[color:var(--ba-sidebar-foreground)]",
            className,
          )}
          {...rest}
        >
          <BellGlyph className="size-5 opacity-90" aria-hidden />
          {hasUnread ? <UnreadBadge total={total} hasUrgent={hasUrgent} /> : null}
        </button>
      );
    }

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        className={cn(
          "group relative flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-[color:var(--ba-sidebar-foreground)]/80 transition-colors hover:bg-[color:var(--ba-sidebar-active)]/60 hover:text-[color:var(--ba-sidebar-foreground)]",
          className,
        )}
        {...rest}
      >
        <BellGlyph className="size-4 opacity-80" aria-hidden />
        <span className="flex-1 truncate text-left">Notificaciones</span>
        {hasUnread ? (
          <span
            className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
              hasUrgent
                ? "bg-destructive text-destructive-foreground"
                : "bg-[color:var(--ba-accent)] text-[color:var(--ba-accent-foreground)]",
            )}
          >
            {total > 99 ? "99+" : total}
          </span>
        ) : null}
      </button>
    );
  },
);

function UnreadBadge({
  total,
  hasUrgent,
}: {
  total: number;
  hasUrgent: boolean;
}) {
  return (
    <span
      className={cn(
        "absolute top-1 right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
        hasUrgent
          ? "bg-destructive text-destructive-foreground"
          : "bg-[color:var(--ba-accent)] text-[color:var(--ba-accent-foreground)]",
      )}
      aria-hidden
    >
      {total > 9 ? "9+" : total}
    </span>
  );
}
