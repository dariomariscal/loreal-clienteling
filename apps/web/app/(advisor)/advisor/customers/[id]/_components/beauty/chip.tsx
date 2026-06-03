"use client";

import { cn } from "@/lib/utils";
import type { GlyphComponent } from "./constants";

export function Chip({
  Glyph,
  label,
  accent,
}: {
  Glyph?: GlyphComponent;
  label: string;
  accent?: "success" | "destructive";
}) {
  return (
    <li>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
          accent === "success" &&
            "border-success/40 bg-success/10 text-success",
          accent === "destructive" &&
            "border-destructive/40 bg-destructive/10 text-destructive",
          !accent && "border-border bg-card text-foreground",
        )}
      >
        {Glyph && (
          <Glyph
            className={cn(
              "size-3.5",
              !accent && "text-muted-foreground",
            )}
          />
        )}
        {label}
      </span>
    </li>
  );
}
