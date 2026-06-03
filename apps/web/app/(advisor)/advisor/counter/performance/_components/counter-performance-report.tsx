"use client";

import * as React from "react";
import {
  ReportShell,
  KpiStrip,
  BaPerformanceTable,
  BaDetailPanel,
  type BaPerformanceRowVM,
} from "@/components/reports";
import { FilterBar } from "@/components/filters";
import { KpiCard } from "@/components/ui/kpi-card";
import { useBaPerformance } from "@/lib/hooks/use-analytics";
import { useFilters } from "@/lib/filters/use-filters";

/**
 * Report 6 — BA performance for the Counter Manager. Tabla rankeada con
 * medallas top 3, sparklines, benchmark del promedio del equipo y drill-down
 * a side panel. Top of strip muestra qué BA lidera y cuántos están bajo
 * promedio (coaching cue).
 */
export function CounterPerformanceReport() {
  const { filters } = useFilters();
  const { data, isLoading } = useBaPerformance(filters);

  const rows = React.useMemo<BaPerformanceRowVM[]>(() => {
    if (!data) return [];
    return data
      .map((r) => ({
        baId: r.baId,
        fullName: r.fullName ?? "—",
        transactions: r.sales.orderCount,
        registrations: r.registrations,
        followUps: r.followUps?.completed ?? 0,
        recommendations: r.recommendations.total,
        totalSales: Number(r.sales.totalAmount ?? 0),
      }))
      .sort((a, b) => b.totalSales - a.totalSales);
  }, [data]);

  const teamAvg = React.useMemo(() => {
    if (rows.length === 0) return undefined;
    const sum = rows.reduce(
      (acc, r) => ({
        transactions: acc.transactions + r.transactions,
        registrations: acc.registrations + r.registrations,
        followUps: acc.followUps + r.followUps,
        recommendations: acc.recommendations + r.recommendations,
      }),
      { transactions: 0, registrations: 0, followUps: 0, recommendations: 0 },
    );
    return {
      transactions: Math.round(sum.transactions / rows.length),
      registrations: Math.round(sum.registrations / rows.length),
      followUps: Math.round(sum.followUps / rows.length),
      recommendations: Math.round(sum.recommendations / rows.length),
    };
  }, [rows]);

  const topBa = rows[0];
  const underAverage = teamAvg
    ? rows.filter((r) => r.transactions < teamAvg.transactions).length
    : 0;

  return (
    <>
      <ReportShell
        title="Desempeño por BA"
        description="Ranking del equipo en el período"
        filters={<FilterBar role="counter_manager" />}
      >
        <KpiStrip columns={3}>
          <KpiCard
            label="Top performer"
            value={topBa?.fullName ?? "—"}
            loading={isLoading}
            helper={
              topBa
                ? `${topBa.transactions} transacciones`
                : undefined
            }
          />
          <KpiCard
            label="BAs activos"
            value={rows.length}
            loading={isLoading}
            helper="En el período seleccionado"
          />
          <KpiCard
            label="Bajo promedio"
            value={underAverage}
            loading={isLoading}
            helper={
              underAverage > 0
                ? "Candidatos a 1:1 de coaching"
                : "Todo el equipo en o sobre promedio"
            }
          />
        </KpiStrip>

        <section className="rounded-xl border border-border bg-card">
          <BaPerformanceTable
            rows={rows}
            teamAverage={teamAvg}
            loading={isLoading}
          />
        </section>
      </ReportShell>

      <BaDetailPanel />
    </>
  );
}
