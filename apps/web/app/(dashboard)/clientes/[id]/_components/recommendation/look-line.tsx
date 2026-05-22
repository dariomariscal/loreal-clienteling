"use client";

import { CloseGlyph, RecommendGlyph } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";
import type { DraftLine } from "./use-look-draft";

export function LookLine({
  line,
  onChangeNotes,
  onRemove,
  disabled,
}: {
  line: DraftLine;
  onChangeNotes: (v: string) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const image = line.product.images?.[0];

  return (
    <li className="rounded-xl border border-border/40 bg-background p-2.5">
      <div className="flex gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted/40">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              className="absolute inset-0 size-full object-cover"
              loading="lazy"
            />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {line.product.brand?.displayName && (
                <p className="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {line.product.brand.displayName}
                </p>
              )}
              <p className="truncate font-heading text-[13px] leading-tight text-foreground">
                {line.product.name}
              </p>
            </div>
            <button
              onClick={onRemove}
              disabled={disabled}
              aria-label="Quitar"
              className="shrink-0 rounded p-1 text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <CloseGlyph className="size-3" />
            </button>
          </div>
        </div>
      </div>

      <textarea
        value={line.notes}
        onChange={(e) => onChangeNotes(e.target.value)}
        disabled={disabled}
        placeholder="¿Por qué se lo recomiendo? (opcional)"
        rows={2}
        className={cn(
          "mt-2 w-full resize-none rounded-lg border border-border/40 bg-muted/20 px-2.5 py-1.5",
          "text-[12px] leading-snug text-foreground outline-none transition-colors",
          "placeholder:text-muted-foreground/50",
          "focus-visible:border-ring focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/30",
        )}
      />
    </li>
  );
}

export function EmptyLook() {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground/60">
        <RecommendGlyph className="size-5" />
      </div>
      <p className="font-heading text-sm text-foreground">Tablero vacío</p>
      <p className="text-[12px] leading-snug text-muted-foreground">
        Toca productos del catálogo para armar la recomendación.
      </p>
    </div>
  );
}
