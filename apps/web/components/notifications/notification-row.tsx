"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import type { NotificationWithCustomer } from "@loreal/contracts";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CloseGlyph } from "@/components/ui/glyphs";
import {
  NOTIFICATION_KIND_META,
  NOTIFICATION_PRIORITY_LABEL,
  NOTIFICATION_PRIORITY_VARIANT,
} from "@/lib/notifications/notification-kind-meta";
import { cn } from "@/lib/utils";

interface Props {
  notification: NotificationWithCustomer;
  /** Optional dismiss button — hidden inside the bell dropdown to save space. */
  showDismiss?: boolean;
  onClick?: () => void;
  onDismiss?: () => void;
}

/**
 * One row inside the bell dropdown or the inbox page. Renders the kind icon,
 * customer avatar (when joined), title, body and a "hace 3 min"-style stamp.
 * Unread rows show a small accent dot on the right.
 */
export function NotificationRow({
  notification: n,
  showDismiss = false,
  onClick,
  onDismiss,
}: Props) {
  const meta = NOTIFICATION_KIND_META[n.kind];
  const Icon = meta.icon;
  const unread = n.readAt === null;
  const customer = n.customer;

  const content = (
    <>
      <span className="relative shrink-0">
        {customer ? (
          <CustomerAvatar
            firstName={customer.firstName}
            lastName={customer.lastName}
            avatarUrl={customer.avatarUrl}
            size="md"
          />
        ) : (
          <span className="flex size-10 items-center justify-center rounded-full bg-[color:var(--ba-accent-soft)] text-[color:var(--ba-accent)]">
            <Icon className="size-5" />
          </span>
        )}
        {customer ? (
          <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border-2 border-background bg-foreground text-background">
            <Icon className="size-3" />
          </span>
        ) : null}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {n.title}
          </span>
          {n.priority === "urgent" ? (
            <Badge
              variant={NOTIFICATION_PRIORITY_VARIANT[n.priority]}
              size="sm"
            >
              {NOTIFICATION_PRIORITY_LABEL[n.priority]}
            </Badge>
          ) : null}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
          {n.body}
        </span>
        <span className="mt-1 block text-[11px] text-muted-foreground/80">
          {formatDistanceToNowStrict(new Date(n.createdAt), {
            locale: es,
            addSuffix: true,
          })}
        </span>
      </span>

      {unread ? (
        <span
          aria-label="Sin leer"
          className="mt-1 inline-block size-2 shrink-0 rounded-full bg-[color:var(--ba-accent)]"
        />
      ) : null}

      {showDismiss ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss?.();
          }}
          aria-label="Descartar"
          className="ml-1 shrink-0"
        >
          <CloseGlyph className="size-4" />
        </Button>
      ) : null}
    </>
  );

  const baseClasses = cn(
    "flex items-start gap-3 border-l-2 px-4 py-3 text-left transition-colors",
    unread
      ? "border-l-[color:var(--ba-accent)] bg-[color:var(--ba-accent-soft)]/40"
      : "border-l-transparent hover:bg-muted/60",
  );

  if (n.actionUrl) {
    return (
      <Link href={n.actionUrl} onClick={onClick} className={baseClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cn(baseClasses, "w-full")}>
      {content}
    </button>
  );
}
