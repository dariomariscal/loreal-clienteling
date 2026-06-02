"use client";

import { SectionCard } from "@/components/advisor/section-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { APPOINTMENT_OUTCOME_LABEL } from "@/lib/appointments/labels";
import type { OutcomeBreakdownEntry } from "@loreal/contracts";

interface OutcomeBreakdownCardProps {
  data: OutcomeBreakdownEntry[];
}

/**
 * Outcome distribution donut — Tulip "Outcome breakdown" pattern. Hex colors
 * align with our Badge variants (success/info/warning/secondary/outline) so
 * the donut and the legend stay visually consistent with status pills.
 */
const OUTCOME_COLOR: Record<string, string> = {
  sale_closed: "oklch(0.52 0.17 150)",
  sample_given: "oklch(0.55 0.18 255)",
  future_intent: "oklch(0.75 0.15 65)",
  no_purchase: "oklch(0.7 0.005 285)",
  referred_out: "oklch(0.85 0.005 285)",
};

export function OutcomeBreakdownCard({ data }: OutcomeBreakdownCardProps) {
  const chartData = data.map((d) => ({
    name: APPOINTMENT_OUTCOME_LABEL[d.outcomeCode] ?? d.outcomeCode,
    value: d.count,
    color: OUTCOME_COLOR[d.outcomeCode] ?? "oklch(0.7 0.005 285)",
  }));

  return (
    <SectionCard title="Cómo se cierra cada cita">
      {chartData.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-muted-foreground">
          Aún no hay citas cerradas en este período.
        </p>
      ) : (
        <div className="px-2 pb-3 pt-1">
          <DonutChart data={chartData} />
        </div>
      )}
    </SectionCard>
  );
}
