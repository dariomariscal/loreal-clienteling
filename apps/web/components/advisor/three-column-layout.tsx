"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ThreeColumnLayoutProps {
  list: ReactNode;
  detail: ReactNode;
  listClassName?: string;
  detailClassName?: string;
}

export function ThreeColumnLayout({
  list,
  detail,
  listClassName,
  detailClassName,
}: ThreeColumnLayoutProps) {
  return (
    <div className="grid h-full w-full grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr]">
      <aside
        className={cn(
          "hidden md:flex flex-col overflow-hidden border-r border-[color:var(--ba-sidebar-border)] bg-background",
          listClassName,
        )}
      >
        {list}
      </aside>
      <section
        className={cn(
          "flex flex-col overflow-hidden bg-[color:var(--ba-surface)]",
          detailClassName,
        )}
      >
        {detail}
      </section>
    </div>
  );
}

interface SingleColumnProps {
  children: ReactNode;
  className?: string;
}

export function SingleColumn({ children, className }: SingleColumnProps) {
  return (
    <section
      className={cn(
        "flex h-full w-full flex-col overflow-hidden bg-[color:var(--ba-surface)]",
        className,
      )}
    >
      {children}
    </section>
  );
}
