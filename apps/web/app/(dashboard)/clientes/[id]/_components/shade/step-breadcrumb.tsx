"use client";

import { cn } from "@/lib/utils";

export function StepBreadcrumb({
  steps,
}: {
  steps: Array<{
    active: boolean;
    done: boolean;
    label: string;
    disabled?: boolean;
    onClick: () => void;
  }>;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
      {steps.map((s, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-muted-foreground/40">›</span>}
          <button
            type="button"
            onClick={s.onClick}
            disabled={s.disabled}
            className={cn(
              "max-w-[160px] truncate rounded-full px-2 py-0.5 transition-colors",
              s.active && "bg-foreground text-background",
              !s.active && s.done && "text-foreground hover:bg-muted",
              !s.active && !s.done && "text-muted-foreground/70",
              s.disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {s.label}
          </button>
        </span>
      ))}
    </div>
  );
}
