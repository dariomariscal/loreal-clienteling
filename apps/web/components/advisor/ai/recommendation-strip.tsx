"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { PackageGlyph } from "@/components/ui/glyphs";
import { formatMoney } from "@/components/advisor/customer-vocabulary";
import type { EngineRecommendation } from "@loreal/contracts";

interface Props {
  recommendations: EngineRecommendation[];
  onSelect: (rec: EngineRecommendation) => void;
}

/**
 * Horizontal swipeable strip of compact product mini-cards. Used for the
 * "Otras opciones" rail under the hero so the BA can scan secondary
 * recommendations without losing the hero out of view.
 *
 * Scrolls with native momentum on touch; on desktop the user can also drag
 * left/right with the trackpad. No carousel arrows — keeps the chrome quiet.
 */
export function RecommendationStrip({ recommendations, onSelect }: Props) {
  if (recommendations.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
        Otras opciones
      </p>
      <ul
        className={cn(
          "-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1",
          "scrollbar-thin scrollbar-thumb-border",
        )}
        style={{ scrollbarWidth: "thin" }}
      >
        {recommendations.map((rec) => (
          <li
            key={rec.productId}
            className="snap-start"
          >
            <MiniCard rec={rec} onSelect={onSelect} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniCard({
  rec,
  onSelect,
}: {
  rec: EngineRecommendation;
  onSelect: (rec: EngineRecommendation) => void;
}) {
  const image = rec.images[0];
  return (
    <button
      type="button"
      onClick={() => onSelect(rec)}
      className={cn(
        "group/mini flex w-40 flex-col gap-2 overflow-hidden rounded-xl border border-border bg-card text-left",
        "transition-all duration-150 hover:-translate-y-px hover:border-foreground/15 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
      )}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
        {image ? (
          <Image
            src={image}
            alt={rec.title}
            fill
            sizes="160px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <PackageGlyph className="size-5" />
          </div>
        )}
        <span className="absolute right-1.5 top-1.5 inline-flex h-5 items-center gap-0.5 rounded-full bg-card/90 px-1.5 text-[10px] font-medium tabular-nums text-foreground backdrop-blur">
          {Math.round(rec.score * 100)}%
        </span>
      </div>
      <div className="flex min-h-[3.5rem] flex-col gap-0.5 px-2.5 pb-2.5">
        {rec.brandName ? (
          <span className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
            {rec.brandName}
          </span>
        ) : null}
        <span className="line-clamp-2 text-sm leading-snug font-medium text-foreground">
          {rec.title}
        </span>
        <span className="mt-auto text-xs tabular-nums text-muted-foreground">
          {formatMoney(Number(rec.price))}
        </span>
      </div>
    </button>
  );
}
