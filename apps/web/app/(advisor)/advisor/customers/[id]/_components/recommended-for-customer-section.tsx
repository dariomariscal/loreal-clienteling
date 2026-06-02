"use client";

import * as React from "react";
import { SectionCard } from "@/components/advisor/section-card";
import { Button } from "@/components/ui/button";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { RecommendGlyph, SparkleDotGlyph } from "@/components/ui/glyphs";
import { AISparkleChip } from "@/components/advisor/ai/ai-sparkle-chip";
import { RecommendationHeroCard } from "@/components/advisor/ai/recommendation-hero-card";
import { RecommendationStrip } from "@/components/advisor/ai/recommendation-strip";
import {
  useEngineRecommendationsCache,
  useGenerateRecommendations,
} from "@/lib/hooks/use-recommendation-engine";
import type { EngineRecommendation } from "@loreal/contracts";

interface Props {
  customerId: string;
  /** Called when the BA taps "Enviar por WhatsApp" on a recommendation —
   *  the parent wires this into the MessageSheet with the LLM draft. */
  onSendRecommendationMessage?: (rec: EngineRecommendation) => void;
}

/**
 * Engine-driven product recommendations for a single customer. The first
 * render shows an empty state with a "Generar" CTA; once the BA generates,
 * the section shows:
 *
 *  - one HERO card (highest score)
 *  - a horizontal strip of the remaining candidates
 *  - a footer with the "Regenerar" affordance
 *
 * Lives inside the customer profile's Resumen tab between the KPI strip and
 * ActiveContextSection.
 */
export function RecommendedForCustomerSection({
  customerId,
  onSendRecommendationMessage,
}: Props) {
  const { data: recommendations = [] } = useEngineRecommendationsCache({
    customerId,
  });
  const generate = useGenerateRecommendations();

  const handleGenerate = React.useCallback(() => {
    generate.mutate({
      customerId,
      limit: 5,
      withRationale: true,
      persist: true,
    });
  }, [customerId, generate]);

  const handleSend = React.useCallback(
    (rec: EngineRecommendation) => {
      onSendRecommendationMessage?.(rec);
    },
    [onSendRecommendationMessage],
  );

  const [hero, ...rest] = recommendations;
  const isLoading = generate.isPending;

  return (
    <SectionCard
      title="Recomendado para esta clienta"
      action={<HeaderAction onRegenerate={handleGenerate} loading={isLoading} hasContent={!!hero} />}
    >
      <div className="px-3 pt-1 pb-3">
        {isLoading && !hero ? (
          <GeneratingSkeleton />
        ) : !hero ? (
          <div className="flex flex-col items-center gap-4 px-8 py-10 text-center">
            <AdvisorEmptyState
              icon={<RecommendGlyph className="size-6" />}
              title="Sin sugerencias todavía"
              description="Generemos un top con base en su perfil, compras y rutina."
              className="p-0"
            />
            <Button onClick={handleGenerate} disabled={isLoading}>
              <SparkleDotGlyph data-icon="inline-start" />
              Generar sugerencias
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <RecommendationHeroCard
              recommendation={hero}
              onSendMessage={handleSend}
            />
            {rest.length > 0 ? (
              <RecommendationStrip
                recommendations={rest}
                onSelect={handleSend}
              />
            ) : null}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function HeaderAction({
  onRegenerate,
  loading,
  hasContent,
}: {
  onRegenerate: () => void;
  loading: boolean;
  hasContent: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <AISparkleChip size="sm" />
      {hasContent ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          disabled={loading}
        >
          {loading ? "Regenerando…" : "Regenerar"}
        </Button>
      ) : null}
    </div>
  );
}

function GeneratingSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-5 p-5 sm:grid-cols-[140px_minmax(0,1fr)]">
          <div className="aspect-[4/5] animate-pulse rounded-xl bg-muted" />
          <div className="flex flex-col gap-2">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="border-t border-border bg-muted/40 px-5 py-3">
          <div className="h-7 w-40 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}
