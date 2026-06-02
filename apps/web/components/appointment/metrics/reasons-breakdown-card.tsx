"use client";

import { SectionCard } from "@/components/advisor/section-card";
import { BarChart } from "@/components/charts/bar-chart";
import {
  APPOINTMENT_CANCELLATION_REASON_LABEL,
  APPOINTMENT_NO_SHOW_REASON_LABEL,
} from "@/lib/appointments/labels";
import type {
  CancellationReasonBreakdownEntry,
  NoShowReasonBreakdownEntry,
} from "@loreal/contracts";

interface ReasonsBreakdownCardProps {
  cancellations: CancellationReasonBreakdownEntry[];
  noShows: NoShowReasonBreakdownEntry[];
}

/**
 * "Why we're losing bookings" — horizontal bar with top reasons across both
 * cancellation and no-show. Merged into one chart so the BA reads it as a
 * single funnel insight (Endear "Loss reasons").
 */
export function ReasonsBreakdownCard({
  cancellations,
  noShows,
}: ReasonsBreakdownCardProps) {
  const data = [
    ...cancellations.map((r) => ({
      label: `${APPOINTMENT_CANCELLATION_REASON_LABEL[r.reason] ?? r.reason} (cancel)`,
      value: r.count,
    })),
    ...noShows.map((r) => ({
      label: `${APPOINTMENT_NO_SHOW_REASON_LABEL[r.reason] ?? r.reason} (no-show)`,
      value: r.count,
    })),
  ].sort((a, b) => b.value - a.value);

  return (
    <SectionCard title="Por qué se pierden citas">
      {data.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-muted-foreground">
          Sin cancelaciones ni ausencias en este período.
        </p>
      ) : (
        <div className="px-2 pb-3 pt-1">
          <BarChart
            data={data}
            xKey="value"
            yKey="label"
            layout="vertical"
            color="oklch(0.55 0.13 38)"
            height={Math.max(200, data.length * 36)}
          />
        </div>
      )}
    </SectionCard>
  );
}
