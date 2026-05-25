import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, action, children, className }: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-4 px-6 pt-5 pb-3">
        <h2 className="font-[var(--font-heading)] text-base font-medium tracking-tight text-foreground">
          {title}
        </h2>
        {action ? <div className="text-sm">{action}</div> : null}
      </header>
      <div className="px-2 pb-3">{children}</div>
    </section>
  );
}
