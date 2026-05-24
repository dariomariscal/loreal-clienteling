"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TimePillProps {
  iso: string;
  color?: string | null;
  durationMinutes?: number;
  variant?: "horizontal" | "vertical";
  className?: string;
}

// VISUAL DEVICE: monospaced time pill.
//
// Two variants:
//   - horizontal (default): a thin chip with just the start time. Used in
//     the "Citas hoy" block of /ba/today where space is tight and the
//     duration is irrelevant for scanning.
//   - vertical: a 56×56 square with the start time on top and the duration
//     in muted eyebrow underneath. Used in /ba/schedule where each row
//     needs a self-contained anchor (Cal.com pattern, adapted).
//
// The border + background are tinted at low alpha with the event-type
// color when available — that's the only color carrier on the row, so
// status and channel never have to fight for visual mass.
export function TimePill({
  iso,
  color,
  durationMinutes,
  variant = "horizontal",
  className,
}: TimePillProps) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const tinted = color
    ? { borderColor: `${color}33`, backgroundColor: `${color}10` }
    : undefined;

  if (variant === "vertical") {
    return (
      <span
        className={cn(
          "inline-flex size-14 shrink-0 flex-col items-center justify-center rounded-lg border border-border/40 bg-muted/40 text-foreground",
          className,
        )}
        style={tinted}
      >
        <span className="font-mono text-[14px] tabular-nums leading-none">
          {time}
        </span>
        {typeof durationMinutes === "number" ? (
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {durationMinutes} min
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex w-16 shrink-0 flex-col items-start rounded-md border border-border/40 bg-muted/40 px-2 py-1.5 text-foreground",
        className,
      )}
      style={tinted}
    >
      <span className="font-mono text-[13px] tabular-nums leading-none">
        {time}
      </span>
    </span>
  );
}
