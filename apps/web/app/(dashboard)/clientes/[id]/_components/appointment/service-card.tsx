"use client";

import type { AppointmentEventType } from "@/lib/hooks";
import { ServiceCustomGlyph } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";
import { DEFAULT_DURATION, EVENT_TYPE_GLYPH } from "./constants";

export function ServiceCard({
  type,
  selected,
  recommended,
  onSelect,
}: {
  type: AppointmentEventType;
  selected: boolean;
  recommended: boolean;
  onSelect: () => void;
}) {
  const Glyph = EVENT_TYPE_GLYPH[type.code] ?? ServiceCustomGlyph;
  const color = type.color ?? "var(--accent)";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group/svc relative flex flex-col items-start gap-1 rounded-xl border bg-card p-3 text-left transition-all duration-200",
        selected
          ? "border-foreground shadow-sm"
          : "border-border/60 hover:border-foreground/30",
      )}
      style={selected ? { borderColor: color } : undefined}
    >
      {recommended && !selected && (
        <span className="absolute -top-1.5 right-2 rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-success">
          Sugerido
        </span>
      )}
      <span
        className="flex size-7 items-center justify-center rounded-lg text-foreground"
        style={{ backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)` }}
      >
        <Glyph className="size-4" />
      </span>
      <p className="line-clamp-2 font-heading text-[13px] leading-tight text-foreground">
        {type.displayName}
      </p>
      <p className="text-[11px] text-muted-foreground">
        {type.durationMinutes
          ? `${type.durationMinutes} min`
          : `${DEFAULT_DURATION} min`}
      </p>
    </button>
  );
}
