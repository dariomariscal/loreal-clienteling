import * as React from "react";
import { cn } from "@/lib/utils";

interface ReportShellProps {
  /** Headline of the report. */
  title: string;
  /** Short context line under the title (period, scope, etc.). */
  description?: React.ReactNode;
  /** Top-right toolbar (export buttons, view toggles). */
  toolbar?: React.ReactNode;
  /** Filter bar — sits directly under the header, sticky. */
  filters?: React.ReactNode;
  /** Body of the report — composed from primitives. */
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard layout for every report page. Keeps the shell identical across the
 * 6 reports and 4 roles — only `children` changes. Sticky filter bar so it
 * stays glued under the header on long scrolls (Linear pattern).
 */
export function ReportShell({
  title,
  description,
  toolbar,
  filters,
  children,
  className,
}: ReportShellProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full min-w-0 flex-col gap-6 overflow-y-auto overscroll-contain px-6 py-6 lg:px-8",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {toolbar ? (
          <div className="flex shrink-0 items-center gap-2">{toolbar}</div>
        ) : null}
      </header>

      {filters ? (
        <div className="sticky top-0 z-10 -mx-6 border-b border-border bg-background/95 px-6 py-3 backdrop-blur-sm lg:-mx-8 lg:px-8">
          {filters}
        </div>
      ) : null}

      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}
