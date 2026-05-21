"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  PurchaseDotGlyph,
  SparkleDotGlyph,
  CalendarDotGlyph,
  NoteDotGlyph,
  MessageDotGlyph,
} from "@/components/ui/glyphs";

export type TimelineEventType =
  | "purchase"
  | "recommendation"
  | "appointment"
  | "note"
  | "communication"
  | "registration";

interface TimelineEventActor {
  name: string | null;
  isSelf?: boolean;
}

interface TimelineEventProps {
  type: TimelineEventType;
  timestamp: string;
  actor: TimelineEventActor;
  title: React.ReactNode;
  body?: React.ReactNode;
  onClick?: () => void;
}

/**
 * Visual mapping per event type. Dot color uses semantic tokens so the same
 * palette works in light/dark mode without overrides.
 *
 *   purchase       → success (green)
 *   recommendation → accent (gold brand)
 *   appointment    → warning (amber)
 *   note           → muted (gray)
 *   communication  → info (blue)
 *   registration   → empty ring (neutral)
 */
const EVENT_VISUALS: Record<
  TimelineEventType,
  {
    glyph: React.ComponentType<{ className?: string }> | null;
    dotClass: string;
  }
> = {
  purchase: {
    glyph: PurchaseDotGlyph,
    dotClass: "bg-success text-success-foreground",
  },
  recommendation: {
    glyph: SparkleDotGlyph,
    dotClass: "bg-accent text-accent-foreground",
  },
  appointment: {
    glyph: CalendarDotGlyph,
    dotClass: "bg-warning text-warning-foreground",
  },
  note: {
    glyph: NoteDotGlyph,
    dotClass: "bg-muted text-muted-foreground",
  },
  communication: {
    glyph: MessageDotGlyph,
    dotClass: "bg-info text-info-foreground",
  },
  registration: {
    glyph: null,
    dotClass: "bg-background ring-2 ring-border",
  },
};

export function TimelineEvent({
  type,
  timestamp,
  actor,
  title,
  body,
  onClick,
}: TimelineEventProps) {
  const { glyph: Glyph, dotClass } = EVENT_VISUALS[type];
  const interactive = !!onClick;

  return (
    <li className="relative pl-9 pb-6 last:pb-0">
      {/* Vertical line continues from one event to the next; the last item
          hides the tail so the column doesn't dangle past the final dot. */}
      <span
        aria-hidden
        className="absolute top-3 bottom-0 left-[11px] w-px bg-border last:hidden"
      />

      <span
        aria-hidden
        className={cn(
          "absolute top-0.5 left-0 flex size-6 items-center justify-center rounded-full",
          dotClass,
        )}
      >
        {Glyph ? <Glyph className="size-3.5" /> : null}
      </span>

      <div
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={onClick}
        onKeyDown={
          interactive
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
        className={cn(
          "flex flex-col gap-0.5 rounded-lg",
          interactive &&
            "-mx-2 cursor-pointer px-2 py-1 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        )}
      >
        <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
          <span className="font-medium tabular-nums">{timestamp}</span>
          {actor.name ? (
            <span className="truncate">
              {actor.isSelf ? "Tú" : actor.name}
            </span>
          ) : null}
        </div>
        <p className="text-sm font-medium leading-snug text-foreground">
          {title}
        </p>
        {body ? (
          <p className="text-sm leading-snug text-muted-foreground">{body}</p>
        ) : null}
      </div>
    </li>
  );
}

export function Timeline({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ol className={cn("relative flex flex-col", className)}>{children}</ol>
  );
}
