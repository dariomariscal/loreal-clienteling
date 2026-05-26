"use client";

import { CustomerAvatar } from "@/components/advisor/customer-avatar";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/components/advisor/customer-vocabulary";
import { AdvisorEmptyState } from "@/components/advisor/advisor-empty-state";
import { UserGlyph } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";
import type { CounterBaRankingRow } from "@/lib/hooks/use-counter-dashboard";

interface TeamRankingTableProps {
  ranking: CounterBaRankingRow[];
  loading?: boolean;
}

/**
 * BA ranking for the day. Following gamification research:
 *  - top 2 get a subtle gold tint (not aggressive red/green flags)
 *  - NPS is shown as a compact promoters / detractors split
 *  - tabular-nums everywhere so columns align
 */
export function TeamRankingTable({ ranking, loading }: TeamRankingTableProps) {
  if (loading) {
    return (
      <div className="space-y-2 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 w-full animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (ranking.length === 0) {
    return (
      <AdvisorEmptyState
        icon={<UserGlyph className="size-6" />}
        title="Sin actividad hoy"
        description="El ranking aparece cuando hay ventas o recomendaciones del día."
      />
    );
  }

  // Sort by sales desc (defensive — backend usually returns in order).
  const sorted = [...ranking].sort(
    (a, b) => Number(b.totalAmount ?? 0) - Number(a.totalAmount ?? 0),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wide text-muted-foreground">
          <tr className="border-b border-border">
            <th className="py-2 pr-2 pl-4 text-left font-medium">#</th>
            <th className="py-2 pr-2 text-left font-medium">BA</th>
            <th className="py-2 pr-2 text-right font-medium">Ventas</th>
            <th className="py-2 pr-2 text-right font-medium">Recos</th>
            <th className="py-2 pr-4 text-right font-medium">NPS</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, index) => (
            <tr
              key={row.baId}
              className={cn(
                "border-b border-border last:border-b-0",
                index < 2 && "bg-[color:var(--ba-accent-soft,oklch(0.96_0.018_38))]/40",
              )}
            >
              <td className="py-3 pr-2 pl-4">
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                  {index + 1}
                </span>
              </td>
              <td className="py-3 pr-2">
                <div className="flex items-center gap-2">
                  <CustomerAvatar firstName={row.baName ?? "—"} size="sm" />
                  <span className="truncate font-medium text-foreground">
                    {row.baName ?? "—"}
                  </span>
                </div>
              </td>
              <td className="py-3 pr-2 text-right tabular-nums">
                <div className="text-foreground">
                  {formatMoney(row.totalAmount ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {row.orderCount ?? 0}{" "}
                  {row.orderCount === 1 ? "compra" : "compras"}
                </div>
              </td>
              <td className="py-3 pr-2 text-right tabular-nums">
                <div className="text-foreground">
                  {row.recommendationsConverted ?? 0}/{row.recommendationsTotal ?? 0}
                </div>
                {typeof row.recommendationConversionRate === "number" ? (
                  <div className="text-xs text-muted-foreground">
                    {Math.round(row.recommendationConversionRate * 100)}%
                  </div>
                ) : null}
              </td>
              <td className="py-3 pr-4 text-right">
                <NpsCell
                  nps={row.nps}
                  responseCount={row.npsResponseCount ?? 0}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NpsCell({
  nps,
  responseCount,
}: {
  nps: number | null;
  responseCount: number;
}) {
  if (responseCount === 0 || nps === null) {
    return (
      <Badge variant="outline" className="text-[10px]">
        Sin votos
      </Badge>
    );
  }
  const tone =
    nps >= 50
      ? "text-success bg-success/10"
      : nps >= 0
        ? "text-[var(--color-warning,oklch(0.75_0.15_65))] bg-[var(--color-warning,oklch(0.75_0.15_65))]/10"
        : "text-destructive bg-destructive/10";

  return (
    <div className="inline-flex flex-col items-end gap-0.5">
      <span
        className={cn(
          "inline-flex h-6 min-w-10 items-center justify-center rounded-full px-2 text-xs font-semibold tabular-nums",
          tone,
        )}
      >
        {nps > 0 ? `+${nps}` : nps}
      </span>
      <span className="text-[10px] text-muted-foreground">
        {responseCount} {responseCount === 1 ? "voto" : "votos"}
      </span>
    </div>
  );
}
