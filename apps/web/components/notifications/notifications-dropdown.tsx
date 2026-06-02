"use client";

import Link from "next/link";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { Button } from "@/components/ui/button";
import { BellGlyph } from "@/components/ui/glyphs";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/lib/hooks/use-notifications";
import { NotificationRow } from "./notification-row";

const DROPDOWN_LIMIT = 10;

interface Props {
  /** Closes the parent Sheet after a row is followed. */
  onItemClick: () => void;
  unreadTotal: number;
}

/**
 * The bell-dropdown body. Shows the 10 most recent unread notifications and
 * exposes the two bulk actions ("Marcar todas" / "Ver todas") in the footer.
 * The inbox-page reuses NotificationRow but renders its own list state.
 */
export function NotificationsDropdown({ onItemClick, unreadTotal }: Props) {
  const { data, isLoading } = useNotifications({
    status: "unread",
    limit: DROPDOWN_LIMIT,
  });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = data ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <DropdownSkeleton />
        ) : items.length === 0 ? (
          <AdvisorEmptyState
            icon={<BellGlyph className="size-6" />}
            title="Sin notificaciones"
            description="Cuando lleguen alertas para ti las verás aquí."
          />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((n) => (
              <li key={n.id}>
                <NotificationRow
                  notification={n}
                  onClick={() => {
                    markRead.mutate(n.id);
                    onItemClick();
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          disabled={unreadTotal === 0 || markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
        >
          {markAllRead.isPending ? "Marcando…" : "Marcar todas como leídas"}
        </Button>
        <Link
          href="/advisor/notifications"
          onClick={onItemClick}
          className="text-sm font-medium text-[color:var(--ba-accent)] hover:opacity-80"
        >
          Ver todas
        </Link>
      </footer>
    </div>
  );
}

function DropdownSkeleton() {
  return (
    <ul className="divide-y divide-border">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex items-start gap-3 px-4 py-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-1/4 animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}
