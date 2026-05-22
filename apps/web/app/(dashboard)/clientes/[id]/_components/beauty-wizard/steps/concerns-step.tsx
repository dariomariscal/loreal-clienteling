"use client";

import { cn } from "@/lib/utils";
import { SKIN_CONCERNS } from "../constants";
import type { Draft } from "../use-beauty-draft";
import { Heading } from "../ui";

export function ConcernsStep({
  draft,
  onToggle,
}: {
  draft: Draft;
  onToggle: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Heading
        title="¿Qué le preocupa?"
        hint="Selecciona todas las que apliquen. Esto guía las recomendaciones de productos."
      />
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SKIN_CONCERNS.map((c) => {
          const active = draft.skinConcerns.includes(c.value);
          const Glyph = c.Glyph;
          return (
            <li key={c.value}>
              <button
                type="button"
                onClick={() => onToggle(c.value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all duration-150",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-foreground hover:border-foreground/30",
                )}
              >
                <Glyph className="size-4 shrink-0" />
                <span className="text-[13px] font-medium">{c.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
