"use client";

import { cn } from "@/lib/utils";

export function SlotChip({
  startsAt,
  selected,
  onSelect,
}: {
  startsAt: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const date = new Date(startsAt);
  const label = date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "h-10 rounded-lg border text-sm tabular-nums transition-all duration-150",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-foreground hover:border-foreground/40",
      )}
    >
      {label}
    </button>
  );
}
