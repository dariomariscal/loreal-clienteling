"use client";

import { SectionCard } from "@/components/advisor/section-card";
import { AreaChart } from "@/components/charts/area-chart";
import type { AppointmentTrendBucket } from "@loreal/contracts";

interface TrendCardProps {
  trend: AppointmentTrendBucket[];
}

/**
 * Weekly trend of completed appointments. Single series (completed) keeps the
 * chart legible at small sizes — total / revenue lines would compete for the
 * y-axis. Drill-down to revenue lives in the KPI strip.
 */
export function TrendCard({ trend }: TrendCardProps) {
  return (
    <SectionCard title="Tendencia · últimas semanas">
      {trend.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-muted-foreground">
          Sin datos para graficar todavía.
        </p>
      ) : (
        <div className="px-2 pb-3 pt-1">
          <AreaChart
            data={trend.map((b) => ({ ...b, weekLabel: shortDate(b.weekStart) }))}
            xKey="weekLabel"
            yKey="completed"
            color="oklch(0.58 0.13 38)"
            height={220}
          />
        </div>
      )}
    </SectionCard>
  );
}

function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  });
}
