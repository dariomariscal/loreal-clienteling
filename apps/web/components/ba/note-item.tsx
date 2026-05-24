"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface NoteItemProps {
  body: string;
  createdAt: Date | string;
  author?: string;
  className?: string;
}

// VISUAL DEVICE: plain text with eyebrow timestamp. NOT a card.
//
// The vision says "como leer la libreta Moleskine" — and a Moleskine has
// no card chrome. Each note is just text on the page, with a small
// timestamp eyebrow above. The space between notes is the rhythm.
//
// Why this works: notes are homogeneous and narrative. NN/g says cards
// are for heterogeneous browsing; lists for homogeneous scanning. This
// is even lighter than a list — it's a textual flow.
export function NoteItem({ body, createdAt, author, className }: NoteItemProps) {
  return (
    <article className={cn("group/note py-3 first:pt-0 last:pb-0", className)}>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {formatRelative(createdAt)}
        {author ? <span className="ml-1.5 normal-case tracking-normal">· {author}</span> : null}
      </p>
      <p className="whitespace-pre-line text-[14px] leading-[1.55] text-foreground">{body}</p>
    </article>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatRelative(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 1) {
    const hours = Math.floor((Date.now() - date.getTime()) / 3_600_000);
    if (hours < 1) return "Recién";
    return `Hace ${hours}h`;
  }
  if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days} días`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `Hace ${months} ${months === 1 ? "mes" : "meses"}`;
  }
  const years = Math.floor(days / 365);
  return `Hace ${years} ${years === 1 ? "año" : "años"}`;
}
