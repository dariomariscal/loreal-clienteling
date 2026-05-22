"use client";

import type { Shade } from "@/lib/hooks/use-customer-detail";
import { cn } from "@/lib/utils";
import { SHADE_CATEGORY_LABELS } from "./constants";

export function ShadeRow({ shade }: { shade: Shade }) {
  const captured = new Date(shade.capturedAt);
  const swatchHex = shade.swatchHex;

  return (
    <li className="flex items-center gap-3 rounded-xl border border-border/40 bg-background p-3">
      <span
        className={cn(
          "size-10 shrink-0 rounded-full ring-1 ring-border/30",
          !swatchHex && "bg-muted",
        )}
        style={swatchHex ? { backgroundColor: swatchHex } : undefined}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {SHADE_CATEGORY_LABELS[shade.category] ?? shade.category}
        </p>
        <p className="truncate font-heading text-[13px] text-foreground">
          {shade.productName ?? shade.shadeCode}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {shade.shadeCode}
          {shade.brandName ? ` · ${shade.brandName}` : ""}
        </p>
      </div>
      <time className="shrink-0 text-[10px] text-muted-foreground/70">
        {captured.toLocaleDateString("es-MX", {
          day: "numeric",
          month: "short",
        })}
      </time>
    </li>
  );
}
