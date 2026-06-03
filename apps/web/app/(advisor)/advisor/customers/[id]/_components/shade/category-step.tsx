"use client";

import { cn } from "@/lib/utils";
import { CATEGORIES } from "./constants";

export function CategoryStep({
  value,
  onPick,
}: {
  value: string | null;
  onPick: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-heading text-xl tracking-tight text-foreground">
        ¿Qué categoría?
      </h3>
      <ul className="grid grid-cols-2 gap-2">
        {CATEGORIES.map((c) => {
          const active = value === c.value;
          const Glyph = c.Glyph;
          return (
            <li key={c.value}>
              <button
                type="button"
                onClick={() => onPick(c.value)}
                className={cn(
                  "flex w-full flex-col items-start gap-2 rounded-2xl border bg-card p-4 text-left transition-all duration-200",
                  active
                    ? "border-foreground shadow-sm"
                    : "border-border/60 hover:border-foreground/30",
                )}
              >
                <span
                  className="flex size-10 items-center justify-center rounded-xl bg-muted/60 text-foreground"
                  aria-hidden
                >
                  <Glyph className="size-5" />
                </span>
                <p className="font-heading text-[14px] text-foreground">
                  {c.label}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
