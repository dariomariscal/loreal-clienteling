import { cn } from "@/lib/utils";
import type { RecommendationSignalSource } from "@loreal/contracts";

/**
 * Chip that visualises one engine signal contribution: a label + a 0-100%
 * score, both side-by-side. Used inside the hero card and the score-bars
 * expansion under "Por qué".
 *
 * The label is computed from the source code so the BA always sees the same
 * human term ("Reposición", "Match piel") regardless of where the chip is
 * rendered.
 */
const SOURCE_LABEL: Record<RecommendationSignalSource, string> = {
  content_affinity: "Match piel",
  semantic_match: "Match perfil",
  lookalike_purchase: "Pares similares",
  replenishment_due: "Reposición",
};

interface Props {
  source: RecommendationSignalSource;
  /** 0..1 score from the engine. Rendered as integer %. */
  score: number;
  size?: "sm" | "default";
  className?: string;
}

export function ReasonScoreChip({ source, score, size = "default", className }: Props) {
  const pct = Math.round(score * 100);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card",
        size === "sm" ? "h-5 px-2 text-[10px]" : "h-6 px-2.5 text-[11px]",
        className,
      )}
    >
      <span className="font-medium text-foreground">
        {SOURCE_LABEL[source]}
      </span>
      <span
        aria-hidden
        className="inline-block h-[3px] w-[3px] rounded-full bg-border"
      />
      <span className="tabular-nums text-muted-foreground">{pct}%</span>
    </span>
  );
}
