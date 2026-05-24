import * as React from "react";
import { cn } from "@/lib/utils";

interface ViewHeaderProps {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

// Linear-refresh-style compact view header: 56px tall, rests on the canvas,
// no shadow, no full-width separator. Title left, actions right. The
// eyebrow above the title carries timestamp/context (e.g. today's date).
export function ViewHeader({ title, eyebrow, actions, className }: ViewHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border/40 bg-[var(--ba-surface)]/85 px-6 backdrop-blur-md",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
          {title}
        </h1>
      </div>
      {actions ? <div className="flex items-center gap-1.5">{actions}</div> : null}
    </header>
  );
}
