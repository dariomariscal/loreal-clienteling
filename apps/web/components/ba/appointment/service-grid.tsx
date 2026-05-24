"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { SparkleDotGlyph } from "@/components/ui/glyphs";
import {
  ServiceCabinGlyph,
  ServiceFacialGlyph,
  ServiceAnniversaryGlyph,
  ServiceVipCabinGlyph,
  ServiceProductFollowupGlyph,
  ServiceCustomGlyph,
} from "@/components/ui/glyphs";
import type { AppointmentEventType } from "@/lib/hooks";

type GlyphComponent = React.ComponentType<{ className?: string }>;

const GLYPH_BY_CODE: Record<string, GlyphComponent> = {
  cabin_service: ServiceCabinGlyph,
  facial: ServiceFacialGlyph,
  anniversary_event: ServiceAnniversaryGlyph,
  vip_cabin: ServiceVipCabinGlyph,
  product_followup: ServiceProductFollowupGlyph,
  custom: ServiceCustomGlyph,
};

interface ServiceGridProps {
  eventTypes: AppointmentEventType[];
  selectedId: string | null;
  recommendedId?: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
}

// VISUAL DEVICE: 2-column grid of service cards.
//
// Each card carries the service's color only as a thin border accent
// when selected — never as a fill. The recommended card (today only
// vip_cabin for VIP customers) shows the single AI signifier of the
// whole sheet: a sparkle dot in the top-right corner. No "Recomendado"
// badge — restraint over explanation.
export function ServiceGrid({
  eventTypes,
  selectedId,
  recommendedId,
  onSelect,
  isLoading,
}: ServiceGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/30" />
        ))}
      </div>
    );
  }

  const active = eventTypes
    .filter((t) => t.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="grid grid-cols-2 gap-2">
      {active.map((t) => {
        const Glyph = GLYPH_BY_CODE[t.code] ?? ServiceCustomGlyph;
        const isSelected = t.id === selectedId;
        const isRecommended = t.id === recommendedId;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            aria-pressed={isSelected}
            className={cn(
              "group/svc relative flex h-20 flex-col items-start justify-between rounded-xl border bg-card px-3.5 py-3 text-left transition-all",
              "shadow-xs hover:shadow-sm",
              isSelected
                ? "border-foreground/30"
                : "border-border/40 hover:border-foreground/15",
            )}
            style={
              isSelected && t.color
                ? {
                    borderColor: `${t.color}55`,
                    backgroundColor: `${t.color}08`,
                  }
                : undefined
            }
          >
            {isRecommended ? (
              <span
                aria-label="Recomendado"
                className="absolute right-2 top-2 text-[var(--ba-accent)]"
              >
                <SparkleDotGlyph className="size-3" />
              </span>
            ) : null}

            <Glyph
              className={cn(
                "size-5 transition-colors",
                isSelected ? "text-foreground" : "text-muted-foreground",
              )}
            />

            <div className="min-w-0">
              <p
                className="truncate text-[13px] text-foreground"
                style={{ fontWeight: 540 }}
              >
                {t.displayName}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t.durationMinutes ?? 60} min
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
