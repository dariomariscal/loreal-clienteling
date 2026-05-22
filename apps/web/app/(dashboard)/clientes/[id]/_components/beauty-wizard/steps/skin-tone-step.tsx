"use client";

import { cn } from "@/lib/utils";
import { SKIN_TONES } from "../constants";
import type { Draft } from "../use-beauty-draft";
import { Heading } from "../ui";

export function SkinToneStep({
  draft,
  onSelect,
}: {
  draft: Draft;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Heading
        title="¿Qué tono tiene su piel?"
        hint="Compara con la piel del rostro en luz natural. El cuello suele ser la mejor referencia."
      />
      <ul className="grid grid-cols-5 gap-2">
        {SKIN_TONES.map((t) => {
          const active = draft.skinTone === t.value;
          return (
            <li key={t.value}>
              <button
                type="button"
                onClick={() => onSelect(t.value)}
                className={cn(
                  "group flex w-full flex-col items-center gap-2 rounded-2xl border bg-card p-3 transition-all duration-200",
                  active
                    ? "border-foreground shadow-sm"
                    : "border-border/60 hover:border-foreground/30",
                )}
              >
                <span
                  className={cn(
                    "size-14 rounded-full ring-2 transition-all",
                    active ? "ring-foreground" : "ring-transparent",
                  )}
                  style={{ backgroundColor: t.swatch }}
                  aria-hidden
                />
                <span
                  className={cn(
                    "text-[12px] font-medium",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {t.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
