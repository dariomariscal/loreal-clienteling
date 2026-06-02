"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/components/advisor/customer-vocabulary";
import { CheckGlyph, CloseGlyph, MessageGlyph, PackageGlyph } from "@/components/ui/glyphs";
import { AISparkleChip } from "./ai-sparkle-chip";
import { ReasonScoreChip } from "./reason-score-chip";
import { RationaleQuote } from "./rationale-quote";
import { ReplenishmentTimeline } from "./replenishment-timeline";
import type { EngineRecommendation } from "@loreal/contracts";

interface Props {
  recommendation: EngineRecommendation;
  onSendMessage: (rec: EngineRecommendation) => void;
  onLike?: (rec: EngineRecommendation) => void;
  onDismiss?: (rec: EngineRecommendation) => void;
}

/**
 * The "hero" recommendation card: the highest-score suggestion for the
 * customer, laid out to read in one glance.
 *
 * Anatomy (top → bottom):
 *  - AI provenance header (sparkle chip on the left, overflow on the right)
 *  - Product hero: image at 4:5 ratio + title / brand / price stack
 *  - Rationale quote — the LLM's one-sentence "why"
 *  - Replenishment timeline (only when the replenishment signal contributed)
 *  - Top 2 reason chips (sorted by contributing source priority)
 *  - Primary CTA (WhatsApp) + thumb-up / thumb-down feedback
 *
 * Composes the AI atoms — never re-implements them.
 */
export function RecommendationHeroCard({
  recommendation,
  onSendMessage,
  onLike,
  onDismiss,
}: Props) {
  const image = recommendation.images[0];
  const replenishmentDays =
    recommendation.signals.replenishmentDaysUntilDepletion;
  const topReasons = recommendation.contributingSources.slice(0, 2);

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
      )}
    >
      <header className="flex items-center justify-between gap-3 px-5 pt-4">
        <AISparkleChip label="Sugerido por IA" />
        <span className="text-[11px] tabular-nums text-muted-foreground">
          Score {Math.round(recommendation.score * 100)}
        </span>
      </header>

      <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-5 px-5 pt-4 pb-1 sm:grid-cols-[140px_minmax(0,1fr)]">
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
          {image ? (
            <Image
              src={image}
              alt={recommendation.title}
              fill
              sizes="140px"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <PackageGlyph className="size-6" />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          {recommendation.brandName ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {recommendation.brandName}
            </p>
          ) : null}
          <h3 className="mt-1 font-[family-name:var(--font-heading)] text-lg leading-tight tracking-tight text-foreground sm:text-xl">
            {recommendation.title}
          </h3>
          <p className="mt-1 text-base font-medium text-foreground">
            {formatMoney(Number(recommendation.price))}
          </p>

          {recommendation.rationale ? (
            <div className="mt-4">
              <RationaleQuote>{recommendation.rationale}</RationaleQuote>
            </div>
          ) : null}
        </div>
      </div>

      {typeof replenishmentDays === "number" ? (
        <div className="px-5 pt-4">
          <ReplenishmentTimeline daysUntilDepletion={replenishmentDays} />
        </div>
      ) : null}

      {topReasons.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 px-5 pt-4">
          {topReasons.map((source) => {
            const score = scoreFor(source, recommendation.signals);
            if (score === undefined) return null;
            return (
              <ReasonScoreChip
                key={source}
                source={source}
                score={score}
              />
            );
          })}
        </div>
      ) : null}

      <footer className="mt-5 flex items-center justify-between gap-3 border-t border-border bg-[color:var(--ba-accent-soft)]/30 px-5 py-3">
        <Button
          size="sm"
          variant="default"
          onClick={() => onSendMessage(recommendation)}
        >
          <MessageGlyph data-icon="inline-start" />
          Enviar por WhatsApp
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Buena sugerencia"
            onClick={() => onLike?.(recommendation)}
          >
            <CheckGlyph className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="No me sirve"
            onClick={() => onDismiss?.(recommendation)}
          >
            <CloseGlyph className="size-4" />
          </Button>
        </div>
      </footer>
    </article>
  );
}

function scoreFor(
  source: EngineRecommendation["contributingSources"][number],
  signals: EngineRecommendation["signals"],
): number | undefined {
  switch (source) {
    case "content_affinity":
      return signals.contentAffinity;
    case "semantic_match":
      return signals.semanticMatch;
    case "lookalike_purchase":
      return signals.lookalikePurchase;
    case "replenishment_due":
      return signals.replenishmentDue;
  }
}
