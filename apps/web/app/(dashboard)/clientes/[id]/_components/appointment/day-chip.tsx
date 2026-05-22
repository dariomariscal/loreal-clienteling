"use client";

import { cn } from "@/lib/utils";
import type { DayInfo } from "./use-day-strip";

export function DayChip({
  day,
  selected,
  onSelect,
}: {
  day: DayInfo;
  selected: boolean;
  onSelect: () => void;
}) {
  const weekday = day.date.toLocaleDateString("es-MX", { weekday: "short" });
  const num = day.date.getDate();
  const month = day.date.toLocaleDateString("es-MX", { month: "short" });

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!day.available}
      aria-pressed={selected}
      className={cn(
        "flex w-12 shrink-0 flex-col items-center gap-0.5 rounded-xl border px-1.5 py-2 text-center transition-all duration-150",
        selected && "border-foreground bg-foreground text-background",
        !selected && day.available
          ? "border-border bg-background text-foreground hover:border-foreground/40"
          : "",
        !day.available &&
          "cursor-not-allowed border-border/30 bg-muted/10 text-muted-foreground/40",
      )}
    >
      <span className="text-[9px] uppercase tracking-wider">
        {weekday.replace(".", "")}
      </span>
      <span className="font-heading text-base leading-none tabular-nums">
        {num}
      </span>
      <span className="text-[9px] uppercase tracking-wider opacity-70">
        {month.replace(".", "")}
      </span>
    </button>
  );
}
