"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/charts/sparkline";
import { useReportSidePanel } from "@/components/reports/report-side-panel";
import { CustomerAvatar } from "@/components/advisor/customer-avatar";

export interface BaPerformanceRowVM {
  baId: string;
  fullName: string;
  transactions: number;
  registrations: number;
  followUps: number;
  recommendations: number;
  /** Sales total in MXN — used for ranking sort by default. */
  totalSales: number;
  /** Optional last-N-days trend for the sparkline. */
  trend?: number[];
  /** Optional delta vs previous period (fraction, 0.18 = +18%). */
  delta?: number | null;
}

interface BaPerformanceTableProps {
  rows: BaPerformanceRowVM[];
  /** Team average row drawn as a benchmark divider. Computed by the caller. */
  teamAverage?: Pick<
    BaPerformanceRowVM,
    "transactions" | "registrations" | "followUps" | "recommendations"
  >;
  loading?: boolean;
}

const MEDAL = ["🥇", "🥈", "🥉"];

/**
 * Reusable performance table — Mercaux / BSPK pattern. Rankeable rows with
 * medals for top 3, sparkline, delta vs prior period, plus an inline team
 * average row as benchmark. Click row → BA detail side panel.
 *
 * The component is dumb: caller provides the rows in display order. Sorting,
 * filtering, and metric definitions live in the calling report.
 */
export function BaPerformanceTable({
  rows,
  teamAverage,
  loading,
}: BaPerformanceTableProps) {
  const { open } = useReportSidePanel("baUserId");

  if (loading) return <Skeleton />;
  if (rows.length === 0) {
    return (
      <p className="px-6 py-12 text-center text-sm text-muted-foreground">
        Sin Beauty Advisors en el período.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Th className="w-10">#</Th>
            <Th>Beauty Advisor</Th>
            <ThNum>Trans.</ThNum>
            <ThNum>Reg.</ThNum>
            <ThNum>Seg.</ThNum>
            <ThNum>Recom.</ThNum>
            <Th className="w-24">Tendencia</Th>
            <ThNum>vs ant.</ThNum>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <Row
              key={row.baId}
              row={row}
              rank={index + 1}
              onOpen={() => open(row.baId)}
            />
          ))}
          {teamAverage ? (
            <tr className="border-t border-dashed border-border/70 bg-muted/30 text-xs italic text-muted-foreground">
              <td className="px-3 py-2" />
              <td className="px-3 py-2 font-medium">Promedio del equipo</td>
              <TdNum>{teamAverage.transactions}</TdNum>
              <TdNum>{teamAverage.registrations}</TdNum>
              <TdNum>{teamAverage.followUps}</TdNum>
              <TdNum>{teamAverage.recommendations}</TdNum>
              <td className="px-3 py-2" />
              <td className="px-3 py-2" />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  row,
  rank,
  onOpen,
}: {
  row: BaPerformanceRowVM;
  rank: number;
  onOpen: () => void;
}) {
  const medal = rank <= 3 ? MEDAL[rank - 1] : null;
  const deltaPct = row.delta != null ? Math.round(row.delta * 100) : null;
  const deltaTone =
    deltaPct == null
      ? null
      : Math.abs(deltaPct) < 1
        ? "neutral"
        : deltaPct > 0
          ? "up"
          : "down";

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <td className="px-3 py-2 text-center text-base">
        {medal ?? <span className="text-xs tabular-nums text-muted-foreground">{rank}</span>}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <CustomerAvatar firstName={row.fullName} size="sm" />
          <span className="truncate text-sm font-medium text-foreground">
            {row.fullName}
          </span>
        </div>
      </td>
      <TdNum>{row.transactions}</TdNum>
      <TdNum>{row.registrations}</TdNum>
      <TdNum>{row.followUps}</TdNum>
      <TdNum>{row.recommendations}</TdNum>
      <td className="px-3 py-2">
        {row.trend && row.trend.length > 0 ? (
          <Sparkline
            data={row.trend}
            tone={deltaTone === "down" ? "negative" : "positive"}
            height={20}
          />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-right text-xs tabular-nums">
        {deltaPct == null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span
            className={cn(
              deltaTone === "up" &&
                "text-[var(--color-success,oklch(0.52_0.17_150))]",
              deltaTone === "down" && "text-destructive",
              deltaTone === "neutral" && "text-muted-foreground",
            )}
          >
            {deltaPct > 0 ? "↗" : deltaPct < 0 ? "↘" : "→"}{" "}
            {Math.abs(deltaPct)}%
          </span>
        )}
      </td>
    </tr>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <th className={cn("px-3 py-2", className)}>{children}</th>;
}
function ThNum({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-right">{children}</th>;
}
function TdNum({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-3 py-2 text-right text-sm tabular-nums text-foreground">
      {children}
    </td>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2 p-6">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-10 animate-pulse rounded bg-muted" />
      ))}
    </div>
  );
}
