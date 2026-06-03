"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function PrefRow({
  label,
  accent,
  children,
}: {
  label: string;
  accent?: "success" | "destructive";
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p
        className={cn(
          "text-[11px] font-medium uppercase tracking-[0.12em]",
          accent === "success" && "text-success",
          accent === "destructive" && "text-destructive",
          !accent && "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <ul className="flex flex-wrap gap-1.5">{children}</ul>
    </div>
  );
}
