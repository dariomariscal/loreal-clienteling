"use client";

import { SKIN_TYPES } from "../constants";
import type { Draft } from "../use-beauty-draft";
import { Heading, SelectableCard } from "../ui";

export function SkinTypeStep({
  draft,
  onSelect,
}: {
  draft: Draft;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Heading
        title="¿Cómo es su piel?"
        hint="Elige la opción que mejor describe el tipo de piel de la clienta."
      />
      <ul className="grid gap-2 sm:grid-cols-2">
        {SKIN_TYPES.map((t) => {
          const Glyph = t.Glyph;
          return (
            <SelectableCard
              key={t.value}
              selected={draft.skinType === t.value}
              onClick={() => onSelect(t.value)}
            >
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-foreground"
                aria-hidden
              >
                <Glyph className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-[14px] text-foreground">
                  {t.label}
                </p>
                <p className="line-clamp-2 text-[12px] leading-snug text-muted-foreground">
                  {t.description}
                </p>
              </div>
            </SelectableCard>
          );
        })}
      </ul>
    </div>
  );
}
