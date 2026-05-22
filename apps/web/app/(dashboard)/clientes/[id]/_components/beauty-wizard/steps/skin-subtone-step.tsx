"use client";

import { cn } from "@/lib/utils";
import { SKIN_SUBTONES } from "../constants";
import type { Draft } from "../use-beauty-draft";
import { Heading } from "../ui";

export function SkinSubtoneStep({
  draft,
  onSelect,
}: {
  draft: Draft;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Heading
        title="¿Cuál es su subtono?"
        hint="Muchas clientas no saben su subtono — usa la pista debajo de cada opción."
      />
      <ul className="grid gap-2 sm:grid-cols-3">
        {SKIN_SUBTONES.map((s) => {
          const active = draft.skinSubtone === s.value;
          return (
            <li key={s.value}>
              <button
                type="button"
                onClick={() => onSelect(s.value)}
                className={cn(
                  "flex h-full w-full flex-col items-start gap-2 rounded-2xl border bg-card p-3 text-left transition-all duration-200",
                  active
                    ? "border-foreground shadow-sm"
                    : "border-border/60 hover:border-foreground/30",
                )}
              >
                <span
                  className="h-12 w-full rounded-xl"
                  style={{ background: s.swatch }}
                  aria-hidden
                />
                <p className="font-heading text-[14px] text-foreground">
                  {s.label}
                </p>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {s.hint}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
