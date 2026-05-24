"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SparkleDotGlyph } from "@/components/ui/glyphs";

interface NextStepCardProps {
  title: string;
  rationale?: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

// VISUAL DEVICE: the single accent card on the customer profile.
//
// THIS is the screen's one star. The accent border + soft tint + the
// only primary button on the page = visual gravity. The Refactoring UI
// rule applies: if everything is card, nothing is. So we make sure
// nothing else around it is a card.
//
// The rationale line implements Explainable Rationale (Smashing 2026):
// "porque su intervalo es 60d" — the BA understands WHY, never gets a
// mystery suggestion.
export function NextStepCard({
  title,
  rationale,
  actionLabel = "Ver borrador",
  onAction,
  onDismiss,
  className,
}: NextStepCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-[var(--ba-accent)]/25 bg-gradient-to-br from-[var(--ba-accent-soft)]/60 to-transparent p-5 shadow-xs",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--ba-accent)]/12 text-[var(--ba-accent)]"
          aria-hidden
        >
          <SparkleDotGlyph className="size-3.5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--ba-accent)]">
            Próximo paso
          </p>
          <p className="mt-0.5 text-[16px] leading-snug font-medium text-foreground">
            {title}
          </p>
          {rationale ? (
            <p className="mt-1 text-[12px] text-muted-foreground">{rationale}</p>
          ) : null}

          <div className="mt-3.5 flex items-center gap-2">
            {onAction ? (
              <Button
                onClick={onAction}
                size="sm"
                className="bg-[var(--ba-accent)] text-[var(--ba-accent-foreground)] hover:bg-[var(--ba-accent)]/90"
              >
                {actionLabel}
              </Button>
            ) : null}
            {onDismiss ? (
              <button
                type="button"
                onClick={onDismiss}
                className="text-[12px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Ya lo hice
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
