"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  PurchaseDotGlyph,
  CalendarDotGlyph,
  NoteDotGlyph,
  MessageDotGlyph,
  SparkleDotGlyph,
} from "@/components/ui/glyphs";

export type ActivityKind = "purchase" | "appointment" | "note" | "message" | "ai";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  description?: string;
  at: Date | string;
  href?: string;
}

interface ActivityTimelineProps {
  items: ActivityItem[];
  className?: string;
}

// VISUAL DEVICE: vertical timeline with dot + connector line.
//
// Cronología necesita su propia gramática. Linear y Attio (omnichannel
// timeline) usan exactamente este patrón. Not a list of card rows. Not
// a table. A vertical thread where the line between dots IS the
// narrative — you can see the gaps between events.
//
// Empty state is invitation, not error.
export function ActivityTimeline({ items, className }: ActivityTimelineProps) {
  if (items.length === 0) {
    return (
      <p className={cn("text-[13px] text-muted-foreground", className)}>
        Sin actividad reciente. La historia se irá construyendo con cada interacción.
      </p>
    );
  }

  return (
    <ol className={cn("relative space-y-4", className)}>
      {items.map((item, index) => (
        <ActivityRow
          key={item.id}
          item={item}
          isLast={index === items.length - 1}
        />
      ))}
    </ol>
  );
}

function ActivityRow({ item, isLast }: { item: ActivityItem; isLast: boolean }) {
  const Glyph = glyphForKind(item.kind);
  return (
    <li className="relative flex gap-3.5">
      {/* Connector line — drawn from the dot down to the next dot */}
      {isLast ? null : (
        <span
          aria-hidden
          className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-border"
        />
      )}

      <span
        className={cn(
          "relative z-10 mt-0.5 inline-flex size-[22px] shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-border",
          item.kind === "ai" && "text-[var(--ba-accent)] ring-[var(--ba-accent)]/40",
        )}
        aria-hidden
      >
        <Glyph className="size-3" />
      </span>

      <div className="min-w-0 flex-1 pb-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[13.5px] text-foreground">{item.title}</p>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatRelative(item.at)}
          </span>
        </div>
        {item.description ? (
          <p className="mt-0.5 line-clamp-2 text-[12.5px] text-muted-foreground">
            {item.description}
          </p>
        ) : null}
      </div>
    </li>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function glyphForKind(kind: ActivityKind) {
  switch (kind) {
    case "purchase":
      return PurchaseDotGlyph;
    case "appointment":
      return CalendarDotGlyph;
    case "note":
      return NoteDotGlyph;
    case "message":
      return MessageDotGlyph;
    case "ai":
      return SparkleDotGlyph;
  }
}

function formatRelative(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 1) {
    const hours = Math.floor((Date.now() - date.getTime()) / 3_600_000);
    if (hours < 1) return "ahora";
    return `${hours}h`;
  }
  if (days === 1) return "ayer";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}m`;
  return `${Math.floor(days / 365)}a`;
}
