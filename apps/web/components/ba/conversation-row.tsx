"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { SparkleDotGlyph } from "@/components/ui/glyphs";
import {
  ChannelGlyphOverlay,
  type CommunicationChannel,
} from "./channel-glyph-overlay";

interface ConversationRowProps {
  customerId: string;
  customerName: string;
  channel: CommunicationChannel;
  preview: string;
  sentAt: string;
  unread?: boolean;
  hasAiDraft?: boolean;
  isVip?: boolean;
  className?: string;
}

// VISUAL DEVICE: 68px list row. Typographic-first.
//
// Hybrid of Linear Inbox (single dot for unread, no background tint,
// generous whitespace) and Endear/Front (avatar-centric because the
// entity is a person, not an email). The channel sits as a 14px overlay
// on the avatar — metadata that disappears at a glance, never competes.
//
// Read vs unread is signaled only by:
//   - the 6px accent dot before the avatar
//   - the name weight (540 → 600 when unread)
//   - the preview opacity (read rows drop to 70%)
// No background tint. No bold preview. No chip.
//
// The single AI signifier is a sparkle + "Borrador" pair in the
// timestamp column — appears only when there is a pending AI draft.
// One sparkle in the whole app, one meaning.
export function ConversationRow({
  customerId,
  customerName,
  channel,
  preview,
  sentAt,
  unread,
  hasAiDraft,
  isVip,
  className,
}: ConversationRowProps) {
  return (
    <Link
      href={`/ba/customers/${customerId}/messages`}
      className={cn(
        "group/row relative flex h-[68px] items-center gap-3 px-4 transition-colors",
        "hover:bg-muted/40",
        unread ? "" : "text-muted-foreground/95",
        className,
      )}
    >
      {/* Unread dot — single signifier, never paired with a chip */}
      <span
        aria-hidden
        className={cn(
          "absolute left-1.5 size-1.5 rounded-full transition-opacity",
          unread ? "bg-[var(--ba-accent)]" : "opacity-0",
        )}
      />

      {/* Avatar + channel overlay */}
      <span className="relative shrink-0">
        <Avatar name={customerName} size="default" />
        <ChannelGlyphOverlay channel={channel} />
      </span>

      {/* Identity + preview */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              "truncate text-[14px] text-foreground",
              unread ? "font-semibold" : "font-medium",
            )}
            style={{ fontWeight: unread ? 600 : 540 }}
          >
            {customerName}
          </p>
          {isVip ? (
            <span
              aria-label="VIP"
              className="size-1 shrink-0 rounded-full bg-[var(--accent)]"
            />
          ) : null}
        </div>
        <p
          className={cn(
            "mt-0.5 truncate text-[13px] text-muted-foreground",
            unread ? "" : "opacity-70",
          )}
        >
          {preview}
        </p>
      </div>

      {/* Right column — timestamp + optional AI draft mark */}
      <div className="flex w-20 shrink-0 flex-col items-end gap-0.5">
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {formatTimestamp(sentAt)}
        </span>
        {hasAiDraft ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--ba-accent)]">
            <SparkleDotGlyph className="size-2.5" />
            Borrador
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  }
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) {
    return d.toLocaleDateString("es-MX", { weekday: "short" });
  }
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}
