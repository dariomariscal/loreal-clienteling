import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdvisorEmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
}

export function AdvisorEmptyState({
  title,
  description,
  icon,
  className,
}: AdvisorEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-8 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="text-[color:var(--ba-sidebar-muted)]">{icon}</div>
      ) : null}
      <p className="font-[var(--font-heading)] text-sm text-foreground">
        {title}
      </p>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
