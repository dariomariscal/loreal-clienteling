"use client";

import { cn } from "@/lib/utils";
import { CHANNELS, type ChannelValue } from "./constants";
import { ChannelIcon } from "./icons";

export function ChannelTabs({
  channel,
  onChange,
  activeConsents,
}: {
  channel: ChannelValue;
  onChange: (c: ChannelValue) => void;
  activeConsents: Set<string>;
}) {
  return (
    <div className="flex shrink-0 gap-1 border-b border-border/40 px-5 py-3">
      {CHANNELS.map((c) => {
        const active = channel === c.value;
        const consent = activeConsents.has(c.consentType);
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={cn(
              "group/tab flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition-all duration-200",
              active
                ? "bg-foreground text-background"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <ChannelIcon channel={c.value} className="size-4" />
            <span className="font-medium">{c.label}</span>
            <span
              className={cn(
                "size-1.5 rounded-full",
                consent
                  ? active
                    ? "bg-background/70"
                    : "bg-success"
                  : "bg-destructive/60",
              )}
              aria-label={consent ? "Con consentimiento" : "Sin consentimiento"}
            />
          </button>
        );
      })}
    </div>
  );
}
