"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  body: string;
  direction: "outbound" | "inbound";
  sentAt?: Date | string;
  status?: "pending" | "sent" | "delivered" | "read" | "failed";
  className?: string;
}

// VISUAL DEVICE: asymmetric chat bubble. Diálogo IS the format.
//
// Outbound (María) on the right with subtle muted background.
// Inbound (clienta) on the left with bordered white. Deliberately NOT
// iMessage-blue — the vision says "más sobrio". The tail-less, rounded
// rectangle reads as modern messenger without the platform association.
//
// Timestamps appear only when there's a gap >5 min from the previous
// message — that's the parent component's job, not this one's.
export function MessageBubble({
  body,
  direction,
  sentAt,
  status,
  className,
}: MessageBubbleProps) {
  const isOutbound = direction === "outbound";
  return (
    <div
      className={cn(
        "flex w-full",
        isOutbound ? "justify-end" : "justify-start",
        className,
      )}
    >
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3.5 py-2",
          isOutbound
            ? "rounded-br-md bg-muted text-foreground"
            : "rounded-bl-md border border-border bg-background text-foreground",
          status === "pending" && "opacity-65",
          status === "failed" && "border-destructive/40 bg-destructive/5",
        )}
      >
        <p className="whitespace-pre-line text-[14px] leading-[1.45]">{body}</p>
        {sentAt || status ? (
          <p
            className={cn(
              "mt-1 flex items-center justify-end gap-1 text-[10px]",
              isOutbound ? "text-muted-foreground/80" : "text-muted-foreground/70",
            )}
          >
            {sentAt ? <span>{formatTime(sentAt)}</span> : null}
            {status === "pending" ? <span>· enviando…</span> : null}
            {status === "failed" ? (
              <span className="text-destructive">· no se envió</span>
            ) : null}
            {status === "read" ? <span>· visto</span> : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function formatTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
