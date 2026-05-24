"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DayGroupHeaderProps {
  label: string;
  date?: Date | string;
  count?: number;
  className?: string;
}

// VISUAL DEVICE: eyebrow header. Whitespace, not chrome.
//
// Linear / Things 3 pattern: the day separator IS the eyebrow text. No
// rule line, no gradient — only generous top padding above the next
// section. Reading rhythm comes from breathing room.
//
// Used in /ba/schedule, /ba/messages, and anywhere else we group rows
// by day or status. The optional `date` appends a humane date (e.g.
// "Lunes 24 may") in the same eyebrow style so the label feels anchored.
export function DayGroupHeader({
  label,
  date,
  count,
  className,
}: DayGroupHeaderProps) {
  const dateLabel = date ? formatDateShort(date) : null;

  return (
    <div
      className={cn(
        "flex items-baseline justify-between pt-6 pb-2 first:pt-0",
        className,
      )}
    >
      <h2 className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
        {dateLabel ? (
          <span className="ml-1.5 text-muted-foreground/70">· {dateLabel}</span>
        ) : null}
      </h2>
      {typeof count === "number" && count > 0 ? (
        <span className="text-[11px] tabular-nums text-muted-foreground/70">
          {count}
        </span>
      ) : null}
    </div>
  );
}

function formatDateShort(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d
    .toLocaleDateString("es-MX", { day: "numeric", month: "short" })
    .toUpperCase();
}
