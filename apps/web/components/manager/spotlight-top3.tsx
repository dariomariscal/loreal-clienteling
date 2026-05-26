"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SpotlightItem {
  id: string;
  /** Title — typically the person's name. */
  title: string;
  /** Secondary line — store, brand, role. */
  subtitle?: string;
  /** Optional avatar slot (caller passes <CustomerAvatar size="lg" />). */
  avatar?: ReactNode;
  /** Primary metric value, big and bold. */
  primaryValue: ReactNode;
  /** Label under the primary value ("Ventas", "Recos"). */
  primaryLabel: string;
  /** Optional badge (NPS, conversion, etc). */
  badge?: ReactNode;
  onClick?: () => void;
}

interface SpotlightTop3Props {
  items: SpotlightItem[];
  loading?: boolean;
  className?: string;
}

/**
 * Three horizontal "podium" cards for the top performers. Used as the
 * spotlight strip above a full ranking table. Avatars + names humanize the
 * leaderboard; the full table below ensures the long tail stays visible
 * (Salesloft/Gong hybrid pattern).
 *
 * iPad: in landscape, 3 cards in a row at ~280pt each; in portrait the
 * grid wraps so #1 takes the full row and #2/#3 share the next.
 */
export function SpotlightTop3({ items, loading, className }: SpotlightTop3Props) {
  if (loading) {
    return (
      <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-3", className)}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-border bg-card"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  const top3 = items.slice(0, 3);

  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-3", className)}>
      {top3.map((item, idx) => (
        <SpotlightCard key={item.id} item={item} rank={idx + 1} />
      ))}
    </div>
  );
}

function SpotlightCard({
  item,
  rank,
}: {
  item: SpotlightItem;
  rank: number;
}) {
  const Tag = item.onClick ? "button" : "div";
  return (
    <Tag
      type={item.onClick ? "button" : undefined}
      onClick={item.onClick}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all",
        rank === 1 &&
          "border-[color:var(--ba-accent)]/40 bg-[color:var(--ba-accent-soft,oklch(0.96_0.018_38))]/50",
        item.onClick &&
          "hover:-translate-y-px hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute -top-2 -left-2 inline-flex size-7 items-center justify-center rounded-full text-xs font-bold tabular-nums shadow-sm",
          rank === 1
            ? "bg-[color:var(--ba-accent)] text-[color:var(--ba-accent-foreground)]"
            : "bg-foreground text-background",
        )}
      >
        {rank}
      </span>
      {item.avatar ? <div className="shrink-0">{item.avatar}</div> : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {item.title}
        </p>
        {item.subtitle ? (
          <p className="truncate text-xs text-muted-foreground">
            {item.subtitle}
          </p>
        ) : null}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-heading)] text-xl font-semibold tabular-nums text-foreground">
            {item.primaryValue}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {item.primaryLabel}
          </span>
        </div>
      </div>
      {item.badge ? <div className="shrink-0">{item.badge}</div> : null}
    </Tag>
  );
}
