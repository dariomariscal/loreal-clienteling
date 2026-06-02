"use client";

import { SectionCard } from "@/components/advisor/section-card";
import { Badge } from "@/components/ui/badge";
import type { TeamRankingEntry } from "@loreal/contracts";

interface TeamRankingCardProps {
  ranking: TeamRankingEntry[];
}

/**
 * Per-BA ranking visible to counter_manager+. Sorted by revenue, which is the
 * KPI managers use to spot top performers and at-risk BAs.
 *
 * Show rate and conversion appear next to each row so the manager can ask
 * "this BA closes 60% but only 70% of customers show up — let's look at
 * reminders" without leaving the page.
 */
export function TeamRankingCard({ ranking }: TeamRankingCardProps) {
  if (ranking.length === 0) {
    return (
      <SectionCard title="Equipo">
        <p className="px-6 py-8 text-center text-sm text-muted-foreground">
          No hay asesoras con citas en este período.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Equipo · ranking"
      action={
        <span className="text-xs text-muted-foreground">
          {ranking.length} asesoras
        </span>
      }
    >
      <ul className="divide-y divide-border">
        {ranking.map((row, i) => (
          <li
            key={row.userId}
            className="grid grid-cols-[24px_minmax(0,1fr)_auto_auto_auto] items-center gap-3 px-4 py-3"
          >
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {row.fullName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {row.completed}/{row.total} completadas · AAV {formatMoneyShort(row.averageAppointmentValue)}
              </p>
            </div>
            <Badge
              variant={
                row.showRatePct >= 85
                  ? "success"
                  : row.showRatePct >= 70
                    ? "warning"
                    : "destructive"
              }
              size="sm"
            >
              {row.showRatePct}% asist.
            </Badge>
            <Badge variant="outline" size="sm">
              {row.conversionRatePct}% conv.
            </Badge>
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {formatMoneyShort(row.revenue)}
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function formatMoneyShort(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toLocaleString("es-MX")}`;
}
